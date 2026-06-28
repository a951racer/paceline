/**
 * HTTP request logging middleware using Morgan.
 *
 * Since Next.js App Router API routes don't use Express-style middleware directly,
 * this module provides a wrapper function that logs HTTP requests using Morgan's
 * formatting conventions.
 *
 * @see Requirements 12.8
 */

import morgan from "morgan";
import { IncomingMessage, ServerResponse } from "http";
import { Socket } from "net";

/**
 * Log format based on environment.
 * - development: 'dev' format (colored, concise)
 * - production: 'combined' format (Apache combined log format)
 */
const LOG_FORMAT =
  process.env.NODE_ENV === "production" ? "combined" : "dev";

/**
 * Create a Morgan logger instance configured for the current environment.
 * Morgan writes to stdout by default which integrates with Heroku's log drain.
 */
const logger = morgan(LOG_FORMAT);

/**
 * Adapts a Next.js/Web API Request into a minimal IncomingMessage-like object
 * so Morgan can extract method, url, and headers.
 */
function adaptRequest(request: Request): IncomingMessage {
  const url = new URL(request.url);
  const msg = new IncomingMessage(new Socket());
  msg.method = request.method;
  msg.url = url.pathname + url.search;
  msg.headers = Object.fromEntries(request.headers.entries());
  return msg;
}

/**
 * Creates a minimal ServerResponse-like object to capture response metadata
 * for Morgan logging.
 */
function adaptResponse(
  statusCode: number,
  headers: Headers
): ServerResponse {
  const req = new IncomingMessage(new Socket());
  const res = new ServerResponse(req);
  res.statusCode = statusCode;

  // Copy content-length for Morgan's :res[content-length] token
  const contentLength = headers.get("content-length");
  if (contentLength) {
    res.setHeader("content-length", contentLength);
  }

  return res;
}

/**
 * Logs an HTTP request/response pair using Morgan.
 * Call this after generating a response to log the completed request.
 *
 * @example
 * ```ts
 * import { logRequest } from '@/middleware/http-logger';
 *
 * export async function GET(request: Request) {
 *   const response = NextResponse.json({ data: "value" });
 *   logRequest(request, response.status, response.headers);
 *   return response;
 * }
 * ```
 */
export function logRequest(
  request: Request,
  statusCode: number,
  headers: Headers
): void {
  const req = adaptRequest(request);
  const res = adaptResponse(statusCode, headers);

  // Morgan calls the callback synchronously for stream-based writing
  logger(req, res, () => {
    // no-op: Morgan writes to stdout directly
  });
}

/**
 * Higher-order function that wraps an API route handler with HTTP logging.
 * Logs each request after the response is generated.
 *
 * @example
 * ```ts
 * import { withLogging } from '@/middleware/http-logger';
 *
 * export const GET = withLogging(async (request) => {
 *   return NextResponse.json({ message: "hello" });
 * });
 * ```
 */
export function withLogging(
  handler: (request: Request) => Promise<Response> | Response
): (request: Request) => Promise<Response> {
  return async (request: Request) => {
    const startTime = Date.now();
    const response = await handler(request);

    // Log after response is ready
    logRequest(request, response.status, response.headers);

    // Optionally add server timing header in development
    if (process.env.NODE_ENV === "development") {
      const duration = Date.now() - startTime;
      const newResponse = new Response(response.body, response);
      newResponse.headers.set("Server-Timing", `total;dur=${duration}`);
      return newResponse;
    }

    return response;
  };
}
