/**
 * Jest configuration (Next.js SWC transform).
 *
 * Note: We use `next/jest` so TypeScript test files and Next.js aliases work out-of-the-box.
 */

const nextJest = require("next/jest")

const createJestConfig = nextJest({
  dir: "./",
})

/** @type {import("jest").Config} */
const customJestConfig = {
  testEnvironment: "node",
  setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
  testMatch: ["**/tests/**/*.test.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
}

module.exports = createJestConfig(customJestConfig)

