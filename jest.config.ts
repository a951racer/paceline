import type { Config } from "jest";

const tsJestTransform = {
  "^.+\\.(ts|tsx)$": [
    "ts-jest",
    { tsconfig: "tsconfig.json", diagnostics: { ignoreCodes: [5011] } },
  ],
} as const;

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src", "<rootDir>/tests"],
  testMatch: [
    "**/__tests__/**/*.{ts,tsx}",
    "**/*.{test,spec}.{ts,tsx}",
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      { tsconfig: "tsconfig.json", diagnostics: { ignoreCodes: [5011] } },
    ],
  },
  projects: [
    {
      displayName: "unit",
      testEnvironment: "node",
      testMatch: ["<rootDir>/tests/unit/**/*.{test,spec}.{ts,tsx}"],
      moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
      },
      transform: tsJestTransform,
    },
    {
      displayName: "property",
      testEnvironment: "node",
      testMatch: ["<rootDir>/tests/property/**/*.{test,spec}.{ts,tsx}"],
      moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
      },
      transform: tsJestTransform,
    },
    {
      displayName: "integration",
      testEnvironment: "node",
      testMatch: ["<rootDir>/tests/integration/**/*.{test,spec}.{ts,tsx}"],
      moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
      },
      transform: tsJestTransform,
    },
    {
      displayName: "react",
      testEnvironment: "jsdom",
      testMatch: ["<rootDir>/src/**/*.{test,spec}.{ts,tsx}"],
      moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
      },
      transform: tsJestTransform,
    },
  ],
};

export default config;
