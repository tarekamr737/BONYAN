// @ts-expect-error Vitest executes this regression test in Node.
import { readFileSync } from "node:fs";
// @ts-expect-error Vitest executes this regression test in Node.
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const sourceFiles = [
  join(process.cwd(), "src/core/screens/HomeScreen.tsx"),
  join(process.cwd(), "src/features/training/screens/CoachScreen.tsx"),
];

describe("localized product copy", () => {
  it("does not contain replacement question-mark runs or corrupted apostrophes", () => {
    for (const sourceFile of sourceFiles) {
      const source = readFileSync(sourceFile, "utf8");
      expect(source).not.toContain("???");
      expect(source).not.toContain("Couldn?t");
      expect(source).not.toContain("Loading conversation?");
    }
  });
});
