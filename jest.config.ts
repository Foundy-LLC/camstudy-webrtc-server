import type { Config } from "jest";

const config: Config = {
  verbose: true,
  preset: "ts-jest",
  extensionsToTreatAsEsm: [".ts"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1"
  },
  transform: {
    // '^.+\\.[tj]sx?$' to process js/ts with `ts-jest`
    // '^.+\\.m?[tj]sx?$' to process js/ts/mjs/mts with `ts-jest`
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        useESM: true
      }
    ]
  },
  transformIgnorePatterns: [
    "node_modules/(?!variables/.*)"
  ],
  roots: ["<rootDir>", "<rootDir>/test/"],
  testEnvironment: "node",
  testMatch: ["**/test/*.test.ts"]
};

export default config;