import { describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq } from "drizzle-orm";
import * as schema from "../server/db/schema";
import {
  extractBrandWatchCtCandidates,
  generateBrandWatchCandidates,
  normalizeBrandTerm,
  normalizeBrandWatchReviewStatus,
  normalizeBrandWatchTermInput,
  normalizeTlds,
  probeBrandCandidateRdap,
  scanBrandWatchCtTerm,
  scanBrandWatchTerm,
} from "../server/utils/brand-watch";

describe("brand watch utilities", () => {
  it("normalizes human brand terms into DNS labels", () => {
    expect(normalizeBrandTerm(" Open AI ")).toBe("open-ai");
    expect(normalizeBrandTerm("Café & Cloud")).toBe("cafe-and-cloud");
  });

  it("normalizes and deduplicates TLD input", () => {
    expect(normalizeTlds([".COM", "net", "bad*", "com"])).toEqual([
      "com",
      "net",
    ]);
  });

  it("generates exact and defensive candidates without duplicates", () => {
    const candidates = generateBrandWatchCandidates("openai", {
      matchStrategy: "STANDARD",
      tlds: ["com"],
      limit: 40,
    });

    expect(candidates[0]).toMatchObject({
      domain: "openai.com",
      mutationType: "exact",
      severity: "MEDIUM",
    });
    expect(candidates.some((candidate) => candidate.domain === "openai-login.com")).toBe(true);
    expect(candidates.some((candidate) => candidate.mutationType === "omission")).toBe(true);
    expect(new Set(candidates.map((candidate) => candidate.domain)).size).toBe(
      candidates.length,
    );
  });

  it("adds homoglyph variants only for aggressive matching", () => {
    const standard = generateBrandWatchCandidates("site", {
      matchStrategy: "STANDARD",
      tlds: ["com"],
    });
    const aggressive = generateBrandWatchCandidates("site", {
      matchStrategy: "AGGRESSIVE",
      tlds: ["com"],
    });

    expect(standard.some((candidate) => candidate.domain === "s1te.com")).toBe(false);
    expect(aggressive.some((candidate) => candidate.domain === "s1te.com")).toBe(true);
  });

  it("validates persisted term input", () => {
    expect(
      normalizeBrandWatchTermInput({
        term: "Dom Beacon",
        matchStrategy: "AGGRESSIVE",
        tlds: "com,io",
        severity: "HIGH",
        scanFrequencyHours: 0,
      }),
    ).toMatchObject({
      normalizedTerm: "dom-beacon",
      matchStrategy: "AGGRESSIVE",
      tlds: ["com", "io"],
      severity: "HIGH",
      scanFrequencyHours: 1,
    });
  });

  it("normalizes candidate review status with an open default", () => {
    expect(normalizeBrandWatchReviewStatus("watching")).toBe("WATCHING");
    expect(normalizeBrandWatchReviewStatus("invalid")).toBe("OPEN");
  });

  it("probes candidate registration state through RDAP", async () => {
    const fetchImpl = async () =>
      new Response(
        JSON.stringify({
          handle: "TEST",
          status: ["active"],
          events: [{ eventAction: "registration", eventDate: "2026-01-01T00:00:00Z" }],
        }),
        { status: 200 },
      );

    const result = await probeBrandCandidateRdap("openai-login.test", {
      fetchImpl: fetchImpl as any,
      resolveRdapServiceBaseImpl: async () => "https://rdap.test/",
    });

    expect(result).toMatchObject({
      status: "REGISTERED",
      source: "rdap",
      lastError: null,
    });
    expect(result.evidence.statuses).toEqual(["active"]);
  });

  it("extracts CT-observed domains that contain the watched term", () => {
    const items = extractBrandWatchCtCandidates(
      [
        {
          id: 101,
          name_value: "*.login-openai.test\ncdn.openai-login.test\nother.test",
          issuer_name: "Test CA",
          not_after: "2026-10-01T00:00:00Z",
        },
      ],
      "OpenAI",
      { tlds: ["test"], severity: "HIGH" },
    );

    expect(items.map((item) => item.candidate.domain)).toEqual([
      "login-openai.test",
      "openai-login.test",
    ]);
    expect(items[0].candidate).toMatchObject({
      mutationType: "ct-prefix",
      severity: "HIGH",
    });
    expect(items[0].evidence.matchedNames).toContain("login-openai.test");
  });

  it("persists scanned candidates and updates term scan time", async () => {
    const sqlite = new Database(":memory:");
    sqlite.exec(`
      CREATE TABLE brand_watch_terms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        term TEXT NOT NULL,
        normalized_term TEXT NOT NULL,
        term_type TEXT NOT NULL DEFAULT 'BRAND',
        match_strategy TEXT NOT NULL DEFAULT 'STANDARD',
        tlds_json TEXT NOT NULL DEFAULT '["com","net","org"]',
        severity TEXT NOT NULL DEFAULT 'MEDIUM',
        enabled INTEGER DEFAULT 1,
        scan_frequency_hours INTEGER DEFAULT 24,
        last_scanned_at INTEGER,
        created_at INTEGER,
        updated_at INTEGER
      );

      CREATE TABLE brand_watch_candidates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        term_id INTEGER NOT NULL REFERENCES brand_watch_terms(id) ON DELETE CASCADE,
        domain TEXT NOT NULL,
        label TEXT NOT NULL,
        tld TEXT NOT NULL,
        mutation_type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'UNKNOWN',
        severity TEXT NOT NULL DEFAULT 'MEDIUM',
        source TEXT NOT NULL DEFAULT 'rdap',
        evidence_json TEXT,
        review_status TEXT NOT NULL DEFAULT 'OPEN',
        review_note TEXT,
        reviewed_at INTEGER,
        reviewed_by TEXT,
        first_seen_at INTEGER,
        last_seen_at INTEGER,
        checked_at INTEGER,
        last_error TEXT,
        created_at INTEGER,
        updated_at INTEGER
      );
    `);
    const db = drizzle(sqlite, { schema });

    const term = await db
      .insert(schema.brandWatchTerms)
      .values({
        term: "OpenAI",
        normalizedTerm: "openai",
        matchStrategy: "STRICT",
        tldsJson: JSON.stringify(["test"]),
        enabled: true,
      })
      .returning()
      .get();

    const result = await scanBrandWatchTerm(term, {
      db,
      limit: 1,
      probeImpl: async () => ({
        status: "REGISTERED",
        source: "rdap",
        evidence: { rdapUrl: "https://rdap.test/domain/openai.test" },
        lastError: null,
      }),
    });

    expect(result).toMatchObject({
      checked: 1,
      registered: 1,
      available: 0,
      notificationsSent: 0,
    });
    expect(result.items[0]).toMatchObject({
      domain: "openai.test",
      becameRegistered: true,
      isNew: true,
    });

    const rows = await db.select().from(schema.brandWatchCandidates).all();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      domain: "openai.test",
      status: "REGISTERED",
      mutationType: "exact",
      reviewStatus: "OPEN",
    });

    const freshTerm = await db
      .select()
      .from(schema.brandWatchTerms)
      .where(eq(schema.brandWatchTerms.id, term.id))
      .get();
    expect(freshTerm?.lastScannedAt).toBeTruthy();

    const ctResult = await scanBrandWatchCtTerm(term, {
      db,
      limit: 10,
      fetchImpl: async () =>
        new Response(
          JSON.stringify([
            {
              id: 202,
              name_value: "app-openai.test",
              issuer_name: "CT Test CA",
              not_after: "2026-12-01T00:00:00Z",
            },
          ]),
          { status: 200 },
        ),
    });

    expect(ctResult).toMatchObject({
      queries: 1,
      discovered: 1,
      error: 0,
      notificationsSent: 0,
    });
    expect(ctResult.items[0]).toMatchObject({
      domain: "app-openai.test",
      becameRegistered: true,
      isNew: true,
    });

    const ctRows = await db
      .select()
      .from(schema.brandWatchCandidates)
      .where(eq(schema.brandWatchCandidates.source, "ct"))
      .all();
    expect(ctRows).toHaveLength(1);
    expect(ctRows[0]).toMatchObject({
      domain: "app-openai.test",
      status: "REGISTERED",
      mutationType: "ct-prefix",
    });

    sqlite.close();
  });
});
