import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const METHOD_SUFFIX = /\.(get|post|put|patch|delete)$/;

const walkFiles = (dir: string): string[] => {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((entry) => {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) return walkFiles(fullPath);
    return stats.isFile() && fullPath.endsWith(".ts") ? [fullPath] : [];
  });
};

const routeFromApiFile = (apiRoot: string, filePath: string) => {
  const relativePath = relative(apiRoot, filePath).replace(/\\/g, "/");
  const parts = relativePath.replace(/\.ts$/, "").split("/");
  const last = parts[parts.length - 1] || "";
  const routeFileName = last.replace(METHOD_SUFFIX, "");

  if (routeFileName === "index") {
    parts.pop();
  } else {
    parts[parts.length - 1] = routeFileName;
  }

  const routeParts = parts
    .filter(Boolean)
    .map((part) => part.replace(/^\[(.+)\]$/, ":$1"));

  return `/api/${routeParts.join("/")}`;
};

const methodsFromApiFile = (filePath: string) => {
  const methodMatch = filePath.match(/\.(get|post|put|patch|delete)\.ts$/);
  if (methodMatch) return [methodMatch[1].toUpperCase()];

  const source = readFileSync(filePath, "utf8");
  const methods = [
    ...source.matchAll(/(?:event\.method|method)\s*===\s*["']([A-Z]+)["']/g),
  ].map((match) => match[1]);

  return [...new Set(methods)].sort();
};

const documentedApiPaths = (markdown: string) =>
  new Set(
    [...markdown.matchAll(/`(\/api\/[^`]+)`/g)]
      .map((match) => match[1].replace(/\*$/, ""))
      .filter((path) => !path.includes("{")),
  );

const documentedApiEntries = (markdown: string) =>
  new Set(
    [...markdown.matchAll(/\|\s*`([^`]+)`\s*\|\s*`(\/api\/[^`]+)`/g)].flatMap(
      (match) => {
        const path = match[2].replace(/\*$/, "");
        if (path.includes("{")) return [];
        return match[1]
          .split("|")
          .map((method) => `${method.trim().toUpperCase()} ${path}`);
      },
    ),
  );

describe("docs/api.md endpoint inventory", () => {
  it("lists every public Nitro API path", () => {
    const apiRoot = join(process.cwd(), "server", "api");
    const actualPaths = new Set(
      walkFiles(apiRoot).map((filePath) => routeFromApiFile(apiRoot, filePath)),
    );
    const docs = readFileSync(join(process.cwd(), "docs", "api.md"), "utf8");
    const documentedPaths = documentedApiPaths(docs);

    const missing = [...actualPaths]
      .filter((path) => !documentedPaths.has(path))
      .sort();

    expect(missing).toEqual([]);
  });

  it("lists every public Nitro API method and path pair", () => {
    const apiRoot = join(process.cwd(), "server", "api");
    const actualEntries = new Set(
      walkFiles(apiRoot).flatMap((filePath) =>
        methodsFromApiFile(filePath).map(
          (method) => `${method} ${routeFromApiFile(apiRoot, filePath)}`,
        ),
      ),
    );
    const docs = readFileSync(join(process.cwd(), "docs", "api.md"), "utf8");
    const documentedEntries = documentedApiEntries(docs);

    const missing = [...actualEntries]
      .filter((entry) => !documentedEntries.has(entry))
      .sort();

    expect(missing).toEqual([]);
  });
});
