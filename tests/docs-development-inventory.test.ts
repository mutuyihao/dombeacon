import { describe, expect, it } from "vitest";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const CANONICAL_DEVELOPMENT_DOCS = new Set([
  "migration.md",
  "product-roadmap.md",
]);

describe("docs/development canonical inventory", () => {
  it("keeps historical implementation write-ups out of docs/development", () => {
    const developmentDir = join(process.cwd(), "docs", "development");
    const markdownFiles = readdirSync(developmentDir)
      .filter((entry) => {
        const fullPath = join(developmentDir, entry);
        return statSync(fullPath).isFile() && entry.endsWith(".md");
      })
      .sort();

    expect(markdownFiles).toEqual([...CANONICAL_DEVELOPMENT_DOCS].sort());
  });
});
