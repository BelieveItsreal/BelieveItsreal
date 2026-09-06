#!/usr/bin/env node
/**
 * generate-graph.mjs
 *
 * Builds a self-hosted replacement for github-readme-activity-graph.
 * Pulls contribution data straight from GitHub's own GraphQL API and
 * renders it to a static SVG file. No third-party rendering service
 * is involved, so there's nothing external that can go down or hit a
 * quota — the only dependency is GitHub itself.
 *
 * Required env vars:
 *   GH_TOKEN     - a GitHub token (the default Actions GITHUB_TOKEN works
 *                  for public contribution data; use a PAT with the
 *                  `read:user` scope if you want private contributions
 *                  counted in)
 *   GH_USERNAME  - the GitHub username to graph
 *
 * Optional env vars:
 *   GRAPH_DAYS   - how many trailing days to plot (default 31)
 *   OUTPUT_PATH  - where to write the SVG (default dist/activity-graph.svg)
 *   THEME        - "tokyo-night" (default) or "light"
 */

import fs from "node:fs";
import path from "node:path";

const TOKEN = process.env.GH_TOKEN;
const USERNAME = process.env.GH_USERNAME;
const DAYS = parseInt(process.env.GRAPH_DAYS || "31", 10);
const OUTPUT = process.env.OUTPUT_PATH || "dist/activity-graph.svg";
const THEME = process.env.THEME || "tokyo-night";

const THEMES = {
  "tokyo-night": {
    bg: "#1a1b27",
    gridColor: "#3b3f51",
    lineColor: "#7aa2f7",
    areaColorStart: "#7aa2f7",
    areaColorEnd: "#1a1b27",
    textColor: "#a9b1d6",
    titleColor: "#ffffff",
  },
  light: {
    bg: "#ffffff",
    gridColor: "#e1e4e8",
    lineColor: "#2f81f7",
    areaColorStart: "#2f81f7",
    areaColorEnd: "#ffffff",
    textColor: "#586069",
    titleColor: "#24292e",
  },
};

function fail(msg) {
  console.error(`[generate-graph] ${msg}`);
  process.exit(1);
}

const QUERY = `
  query($login: String!) {
    user(login: $login) {
      contributionsCollection {
        contributionCalendar {
          weeks {
            contributionDays {
              date
              contributionCount
            }
          }
        }
      }
    }
  }
`;

async function fetchContributions() {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `bearer ${TOKEN}`,
      "Content-Type": "application/json",
      "User-Agent": "activity-graph-generator",
    },
    body: JSON.stringify({ query: QUERY, variables: { login: USERNAME } }),
  });

  if (!res.ok) {
    throw new Error(`GitHub API responded ${res.status} ${res.statusText}`);
  }

  const json = await res.json();
  if (json.errors) {
    throw new Error(`GraphQL error: ${JSON.stringify(json.errors)}`);
  }

  const weeks = json.data.user.contributionsCollection.contributionCalendar.weeks;
  return weeks.flatMap((w) => w.contributionDays);
}

function buildSvg(days, { username, theme }) {
  const width = 800;
  const height = 200;
  const padding = { top: 32, right: 20, bottom: 30, left: 20 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const counts = days.map((d) => d.contributionCount);
  const maxCount = Math.max(1, ...counts);
  const totalContributions = counts.reduce((a, b) => a + b, 0);

  const stepX = days.length > 1 ? chartW / (days.length - 1) : 0;
  const points = days.map((d, i) => {
    const x = padding.left + i * stepX;
    const y = padding.top + chartH - (d.contributionCount / maxCount) * chartH;
    return [x, y];
  });

  const linePath = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(" ");

  const floorY = (padding.top + chartH).toFixed(2);
  const areaPath =
    `M${points[0][0].toFixed(2)},${floorY} ` +
    points.map(([x, y]) => `L${x.toFixed(2)},${y.toFixed(2)}`).join(" ") +
    ` L${points[points.length - 1][0].toFixed(2)},${floorY} Z`;

  const gridLines = [];
  for (let i = 0; i <= 3; i++) {
    const y = padding.top + (chartH / 3) * i;
    gridLines.push(
      `<line x1="${padding.left}" y1="${y.toFixed(2)}" x2="${width - padding.right}" y2="${y.toFixed(
        2
      )}" stroke="${theme.gridColor}" stroke-width="1" stroke-dasharray="2,3" />`
    );
  }

  const labelIdxs = days.length > 2 ? [0, Math.floor((days.length - 1) / 2), days.length - 1] : [0, days.length - 1];
  const labels = labelIdxs
    .map((i) => {
      const [x] = points[i];
      const date = new Date(days[i].date);
      const label = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      return `<text x="${x.toFixed(2)}" y="${height - 8}" font-size="11" fill="${
        theme.textColor
      }" text-anchor="middle" font-family="'Segoe UI', Helvetica, Arial, sans-serif">${label}</text>`;
    })
    .join("\n  ");

  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${username}'s GitHub activity graph">
  <defs>
    <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${theme.areaColorStart}" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="${theme.areaColorEnd}" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" rx="10" fill="${theme.bg}"/>
  <text x="${padding.left}" y="22" font-size="14" font-weight="600" fill="${
    theme.titleColor
  }" font-family="'Segoe UI', Helvetica, Arial, sans-serif">${username}'s Activity Graph</text>
  <text x="${width - padding.right}" y="22" font-size="12" fill="${
    theme.textColor
  }" text-anchor="end" font-family="'Segoe UI', Helvetica, Arial, sans-serif">${totalContributions} contributions (last ${
    days.length
  }d)</text>
  ${gridLines.join("\n  ")}
  <path d="${areaPath}" fill="url(#areaFill)" />
  <path d="${linePath}" fill="none" stroke="${theme.lineColor}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />
  ${labels}
</svg>`;
}

async function main() {
  if (!TOKEN) fail("GH_TOKEN env var is required.");
  if (!USERNAME) fail("GH_USERNAME env var is required.");

  const theme = THEMES[THEME] || THEMES["tokyo-night"];
  const allDays = await fetchContributions();
  const days = allDays.slice(-DAYS);

  if (days.length === 0) fail("No contribution data returned for that user.");

  const svg = buildSvg(days, { username: USERNAME, theme });

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, svg, "utf8");
  console.log(`[generate-graph] wrote ${OUTPUT} (${days.length} days, theme=${THEME})`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    fail(err.stack || err.message);
  });
}

export { buildSvg, THEMES };
