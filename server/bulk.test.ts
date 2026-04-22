/**
 * Tests for the CSV parsing logic used in the Bulk QR generator.
 * The parseCSV function is extracted here for unit testing.
 */
import { describe, expect, it } from "vitest";

// Replicated from client/src/pages/BulkQR.tsx for testability
type BulkRow = { label: string; url: string; status: "pending" | "done" | "error" };

function parseCSV(text: string): BulkRow[] {
  const lines = text.trim().split("\n").filter(l => l.trim());
  const result: BulkRow[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (i === 0 && line.toLowerCase().startsWith("label")) continue; // skip header
    const parts = line.split(",").map(p => p.trim());
    if (parts.length >= 2 && parts[1]) {
      result.push({ label: parts[0] || `QR ${i}`, url: parts[1], status: "pending" });
    }
  }
  return result;
}

describe("parseCSV", () => {
  it("parses a standard CSV with header row", () => {
    const csv = "Label,URL\nMy Website,https://example.com\nInstagram,https://instagram.com/myprofile";
    const rows = parseCSV(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ label: "My Website", url: "https://example.com", status: "pending" });
    expect(rows[1]).toEqual({ label: "Instagram", url: "https://instagram.com/myprofile", status: "pending" });
  });

  it("parses CSV without header row", () => {
    const csv = "My Website,https://example.com\nInstagram,https://instagram.com/myprofile";
    const rows = parseCSV(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0].label).toBe("My Website");
  });

  it("skips rows with missing URL", () => {
    const csv = "Label,URL\nGood Row,https://example.com\nBad Row,";
    const rows = parseCSV(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].label).toBe("Good Row");
  });

  it("skips rows with only one column", () => {
    const csv = "Label,URL\nOnlyLabel\nGood,https://example.com";
    const rows = parseCSV(csv);
    expect(rows).toHaveLength(1);
  });

  it("handles empty input gracefully", () => {
    expect(parseCSV("")).toHaveLength(0);
    expect(parseCSV("   ")).toHaveLength(0);
  });

  it("trims whitespace from label and url", () => {
    const csv = "  My Site  ,  https://example.com  ";
    const rows = parseCSV(csv);
    expect(rows[0].label).toBe("My Site");
    expect(rows[0].url).toBe("https://example.com");
  });

  it("handles up to 50 rows", () => {
    const lines = ["Label,URL"];
    for (let i = 1; i <= 50; i++) {
      lines.push(`Site ${i},https://example${i}.com`);
    }
    const rows = parseCSV(lines.join("\n"));
    expect(rows).toHaveLength(50);
  });

  it("all parsed rows start with pending status", () => {
    const csv = "Label,URL\nA,https://a.com\nB,https://b.com";
    const rows = parseCSV(csv);
    rows.forEach(r => expect(r.status).toBe("pending"));
  });
});
