export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [2, "always", ["feat", "fix", "refactor", "docs", "chore", "test"]],
    "subject-max-length": [2, "always", 50],
  },
};
