import fs from "node:fs";
import { buildSvg, THEMES } from "./generate-graph.mjs";

// Synthesize 31 days of fake contribution counts
const days = Array.from({ length: 31 }, (_, i) => {
  const d = new Date("2026-08-08T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + i);
  const count = Math.max(0, Math.round(5 + 6 * Math.sin(i / 4) + (i % 7 === 0 ? 8 : 0)));
  return { date: d.toISOString().slice(0, 10), contributionCount: count };
});

const svg = buildSvg(days, { username: "BelieveItsreal", theme: THEMES["tokyo-night"] });

fs.mkdirSync("dist", { recursive: true });
fs.writeFileSync("dist/test-activity-graph.svg", svg, "utf8");

// Basic sanity checks
console.assert(svg.startsWith("<svg"), "SVG should start with <svg");
console.assert(svg.includes("</svg>"), "SVG should be closed");
console.assert(svg.includes("BelieveItsreal"), "Username should appear in SVG");
console.assert((svg.match(/<text/g) || []).length >= 4, "Should have title + total + date labels");

console.log("OK — wrote dist/test-activity-graph.svg, length:", svg.length);
