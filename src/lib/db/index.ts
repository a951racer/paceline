/**
 * Database connection utilities barrel export.
 * Provides MongoDB (Mongoose) and TimescaleDB (node-postgres) connections.
 */

export {
  connectMongoDB,
  disconnectMongoDB,
  getMongoDBConnectionState,
} from "./mongodb";

export {
  getTimescalePool,
  queryWithRetry,
  getClient,
  withTransaction,
  disconnectTimescaleDB,
  getPoolStats,
} from "./timescaledb";
