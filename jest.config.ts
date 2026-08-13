import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src", "<rootDir>/tests"],
  // tests/e2e is intentionally NOT excluded here: those suites guard themselves with
  // `describe.skip` when BASE_URL (and, for failure-engineering tests, DLQ_URL) is unset, so they
  // show up as "skipped" rather than failing — both `npm test` and `npm run test:e2e` discover
  // them; only whether BASE_URL is present decides if they actually run.
  collectCoverageFrom: ["src/domain/**/*.ts", "src/application/**/*.ts"],
};

export default config;
