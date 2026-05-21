import fetch from "node-fetch";
import PDFDocument from "pdfkit";
import { UAParser } from "ua-parser-js";
import { env } from "../../config/env.js";
import Link from "../links/schema.js";
import Click from "./schema.js";
const myHeaders = new Headers();

// ─── Design Tokens ────────────────────────────────────────────────────────────
const COLORS = {
  primary: "#2563eb",
  primaryDark: "#1e40af",
  primaryLight: "#eff6ff",
  accent: "#3b82f6",
  success: "#10b981",
  text: "#111827",
  textMuted: "#6b7280",
  border: "#e5e7eb",
  headerBg: "#f9fafb",
  rowAlt: "#f3f4f6",
  white: "#ffffff",
};

const FONT = {
  regular: "Helvetica",
  bold: "Helvetica-Bold",
  oblique: "Helvetica-Oblique",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Truncate text so it fits within maxWidth at a given fontSize */
function truncate(doc, text, maxWidth, fontSize) {
  doc.fontSize(fontSize).font(FONT.regular);
  if (doc.widthOfString(String(text)) <= maxWidth) return String(text);
  let t = String(text);
  while (t.length > 0 && doc.widthOfString(t + "…") > maxWidth) {
    t = t.slice(0, -1);
  }
  return t + "…";
}

/**
 * Draw a section header with a left-accent bar.
 * Returns the Y position after the header.
 */
function drawSectionHeader(doc, label, x, y, width) {
  const barW = 4;
  const barH = 16;
  doc.rect(x, y + 1, barW, barH).fill(COLORS.primary);
  drawCell(
    doc,
    label,
    x + barW + 8,
    y + 2,
    width - barW - 8,
    11,
    "left",
    COLORS.text,
    true,
  );
  doc
    .moveTo(x, y + barH + 6)
    .lineTo(x + width, y + barH + 6)
    .strokeColor(COLORS.border)
    .lineWidth(0.5)
    .stroke();
  // Sync PDFKit cursor
  doc.text("", x, y + barH + 14, { lineBreak: false });
  return y + barH + 14;
}

/**
 * Draw a cell's text without moving doc.y.
 * Uses save/restore so PDFKit's internal cursor is never affected.
 */
function drawCell(doc, text, x, y, width, fontSize, align, color, bold) {
  doc.save();
  doc
    .fillColor(color || COLORS.text)
    .font(bold ? FONT.bold : FONT.regular)
    .fontSize(fontSize)
    .text(text, x, y, {
      width,
      align: align || "left",
      lineBreak: false,
    });
  doc.restore();
}

/**
 * Draw a professional table entirely with explicit coordinates.
 * Never lets doc.y drift — returns the final Y so the caller can advance manually.
 *
 * @param {PDFDocument} doc
 * @param {Array<{ label: string, width: number, align?: 'left'|'right'|'center' }>} columns
 * @param {string[][]} rows
 * @param {{ startY: number, xOffset?: number, headerHeight?: number, rowHeight?: number, fontSize?: number, padding?: number }} opts
 * @returns {number} Y position after the table's bottom border
 */
function drawTable(doc, columns, rows, opts = {}) {
  const {
    startY,
    xOffset = doc.page.margins.left,
    headerHeight = 26,
    rowHeight = 22,
    fontSize = 8.5,
    padding = 8,
  } = opts;

  const pageH = doc.page.height - doc.page.margins.bottom - 20;
  const totalW = columns.reduce((s, c) => s + c.width, 0);
  let y = startY;

  const drawHeader = (atY) => {
    doc.rect(xOffset, atY, totalW, headerHeight).fill(COLORS.primary);
    let cx = xOffset;
    columns.forEach((col) => {
      drawCell(
        doc,
        col.label,
        cx + padding,
        atY + (headerHeight - fontSize) / 2 + 1,
        col.width - padding * 2,
        fontSize,
        col.align,
        COLORS.white,
        true,
      );
      cx += col.width;
    });
  };

  // ── Header ──
  drawHeader(y);
  y += headerHeight;

  // ── Rows ──
  rows.forEach((row, ri) => {
    if (y + rowHeight > pageH) {
      doc.addPage();
      y = doc.page.margins.top;
      drawHeader(y);
      y += headerHeight;
    }

    if (ri % 2 === 1) {
      doc.rect(xOffset, y, totalW, rowHeight).fill(COLORS.rowAlt);
    }

    doc
      .moveTo(xOffset, y + rowHeight)
      .lineTo(xOffset + totalW, y + rowHeight)
      .strokeColor(COLORS.border)
      .lineWidth(0.3)
      .stroke();

    let rx = xOffset;
    row.forEach((cell, ci) => {
      const col = columns[ci];
      const text = truncate(
        doc,
        cell ?? "—",
        col.width - padding * 2,
        fontSize,
      );
      drawCell(
        doc,
        text,
        rx + padding,
        y + (rowHeight - fontSize) / 2 + 1,
        col.width - padding * 2,
        fontSize,
        col.align,
      );
      rx += col.width;
    });

    y += rowHeight;
  });

  // ── Bottom border ──
  doc
    .moveTo(xOffset, y)
    .lineTo(xOffset + totalW, y)
    .strokeColor(COLORS.primary)
    .lineWidth(0.6)
    .stroke();

  // Sync PDFKit's internal cursor to where we actually ended up
  doc.text("", xOffset, y, { lineBreak: false });

  return y;
}

/**
 * Draw a KPI stat card (inline block).
 */
function drawStatCard(doc, x, y, w, h, label, value, color = COLORS.primary) {
  doc.rect(x, y, w, h).fill(COLORS.white);
  doc.rect(x, y, w, h).strokeColor(COLORS.border).lineWidth(0.5).stroke();
  doc.rect(x, y, w, 3).fill(color);
  drawCell(
    doc,
    String(value),
    x + 10,
    y + 14,
    w - 20,
    18,
    "center",
    color,
    true,
  );
  drawCell(
    doc,
    label.toUpperCase(),
    x + 10,
    y + h - 18,
    w - 20,
    7.5,
    "center",
    COLORS.textMuted,
    false,
  );
}

/**
 * Add page numbers and a footer line to every page after PDF is finalised.
 */
function addPageNumbers(doc, totalPages, generatedAt) {
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);

    const footerY = doc.page.height - 30;
    const m = doc.page.margins.left;
    const w = doc.page.width - m - doc.page.margins.right;

    doc
      .moveTo(m, footerY - 6)
      .lineTo(m + w, footerY - 6)
      .strokeColor(COLORS.border)
      .lineWidth(0.5)
      .stroke();

    doc
      .fillColor(COLORS.textMuted)
      .font(FONT.regular)
      .fontSize(7.5)
      .text(`Generated: ${generatedAt}`, m, footerY, {
        width: w / 2,
        align: "left",
      });

    doc
      .fillColor(COLORS.textMuted)
      .font(FONT.regular)
      .fontSize(7.5)
      .text(`Page ${i + 1} of ${range.count}`, m, footerY, {
        width: w,
        align: "right",
      });
  }
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export const createAnalyticsPdf = (res, exportData) => {
  const doc = new PDFDocument({
    size: "A4",
    margin: 36,
    bufferPages: true,
    info: {
      Title: "Amarlink Analytics Report",
      Author: "Amarlink",
      Subject: `Analytics — last ${exportData.periodDays} days`,
      Creator: "Amarlink Analytics",
    },
  });

  doc.pipe(res);

  const m = doc.page.margins.left;
  const pageBottom = doc.page.height - doc.page.margins.bottom;
  const W = doc.page.width - m - doc.page.margins.right; // usable width

  // ── HEADER ────────────────────────────────────────────────────────────────
  // Gradient-like two-tone header
  doc.rect(0, 0, doc.page.width, 70).fill(COLORS.primaryDark);
  doc.rect(0, 50, doc.page.width, 20).fill(COLORS.primary);

  // Logo placeholder circle
  doc.circle(m + 18, 35, 14).fillAndStroke(COLORS.accent, COLORS.white);
  drawCell(doc, "CU", m + 10, 29, 36, 11, "center", COLORS.white, true);
  drawCell(
    doc,
    "Amarlink — Analytics Report",
    m + 42,
    18,
    W - 42,
    17,
    "left",
    COLORS.white,
    true,
  );
  drawCell(
    doc,
    `Reporting period: last ${exportData.periodDays} days  ·  Generated: ${formatDateTime(exportData.generatedAt)}`,
    m + 42,
    40,
    W - 42,
    8.5,
    "left",
    "rgba(255,255,255,0.75)",
    false,
  );

  let y = 82; // start below header

  // ── KPI STAT CARDS ────────────────────────────────────────────────────────
  const cardW = (W - 9) / 4; // 4 cards with 3 gaps of 3px
  const cardH = 58;
  const cardGap = 3;

  const kpis = [
    {
      label: "Total Links",
      value: exportData.overview.totalLinks,
      color: COLORS.primary,
    },
    {
      label: "Total Clicks",
      value: exportData.overview.totalClicks,
      color: COLORS.accent,
    },
    {
      label: "Unique Clicks",
      value: exportData.overview.uniqueClicks,
      color: "#7c3aed",
    },
    {
      label: "Click Rate",
      value: `${exportData.overview.clickRate.toFixed(2)}%`,
      color: COLORS.success,
    },
  ];

  kpis.forEach((kpi, i) => {
    drawStatCard(
      doc,
      m + i * (cardW + cardGap),
      y,
      cardW,
      cardH,
      kpi.label,
      kpi.value,
      kpi.color,
    );
  });

  y += cardH + 18;

  // ── TOP LINKS ─────────────────────────────────────────────────────────────
  y = drawSectionHeader(doc, "Top Links", m, y, W);

  y = drawTable(
    doc,
    [
      { label: "#", width: W * 0.05 },
      { label: "Alias", width: W * 0.18 },
      { label: "Clicks", width: W * 0.12, align: "right" },
      { label: "Short URL", width: W * 0.28 },
      { label: "Destination", width: W * 0.37 },
    ],
    exportData.topLinks.map((link, i) => [
      String(i + 1),
      link.alias,
      String(link.clicks),
      link.shortUrl,
      link.longUrl,
    ]),
    { startY: y, headerHeight: 24, rowHeight: 20 },
  );

  y += 18;

  // ── TRAFFIC MIX ───────────────────────────────────────────────────────────
  if (y + 160 > pageBottom) {
    doc.addPage();
    y = doc.page.margins.top;
  }

  y = drawSectionHeader(doc, "Traffic Mix", m, y, W);

  const halfW = (W - 10) / 2;

  // Left: Countries
  const countriesEnd = drawTable(
    doc,
    [
      { label: "Country", width: halfW * 0.72 },
      { label: "Clicks", width: halfW * 0.28, align: "right" },
    ],
    exportData.topCountries.map((item) => [item.label, String(item.count)]),
    { startY: y, xOffset: m, headerHeight: 24, rowHeight: 18, fontSize: 8 },
  );

  // Right: Devices — same startY, different xOffset
  const devicesEnd = drawTable(
    doc,
    [
      { label: "Device", width: halfW * 0.72 },
      { label: "Clicks", width: halfW * 0.28, align: "right" },
    ],
    exportData.topDevices.map((item) => [item.label, String(item.count)]),
    {
      startY: y,
      xOffset: m + halfW + 10,
      headerHeight: 24,
      rowHeight: 18,
      fontSize: 8,
    },
  );

  y = Math.max(countriesEnd, devicesEnd) + 18;
  // Sync cursor to the true bottom of both tables
  doc.text("", m, y, { lineBreak: false });

  // ── RECENT CLICKS ─────────────────────────────────────────────────────────
  if (y + 200 > pageBottom) {
    doc.addPage();
    y = doc.page.margins.top;
  }

  y = drawSectionHeader(doc, "Recent Clicks  (latest 15)", m, y, W);

  drawTable(
    doc,
    [
      { label: "Timestamp", width: W * 0.18 },
      { label: "Alias", width: W * 0.13 },
      { label: "Country", width: W * 0.13 },
      { label: "Device", width: W * 0.13 },
      { label: "Source", width: W * 0.13 },
      { label: "Referer", width: W * 0.3 },
    ],
    exportData.detailedClicks
      .slice(0, 15)
      .map((click) => [
        click.timestamp,
        click.alias,
        click.country,
        click.device,
        click.source,
        click.referer || "Direct",
      ]),
    { startY: y, headerHeight: 24, rowHeight: 19 },
  );

  // ── FOOTERS & PAGE NUMBERS ────────────────────────────────────────────────
  addPageNumbers(
    doc,
    doc.bufferedPageRange().count,
    formatDateTime(exportData.generatedAt),
  );

  doc.end();
};

const getLocationFromIP = async (ip) => {
  try {
    const requestOptions = {
      method: "GET",
      headers: myHeaders,
      redirect: "follow",
    };
    const res = await fetch(
      `https://api.ipgeolocation.io/v2/ipgeo?apiKey=${env.ipGeolocationApiKey}&ip=${ip}`,
      requestOptions,
    );
    const data = await res.json();
    return {
      city: data.city,
      country: data.country_name,
      region: data.region,
      postal: data.postal,
    };
  } catch (err) {
    return { city: null, country: null, region: null, postal: null };
  }
};
export const trackClick = async ({ linkId, alias, req }) => {
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;

  console.log(
    "Detected IP:",
    ip,
    "| x-forwarded-for:",
    req.headers["x-forwarded-for"],
  );

  const userAgent = req.headers["user-agent"];
  const referer = req.headers.referer || null;
  // Device info
  const parser = new UAParser(userAgent);
  const device = parser.getResult();
  // Location info
  const location = await getLocationFromIP(ip);
  // console.log("loca", location, ip);

  await Click.create({
    linkId,
    alias,
    ip,
    userAgent,
    referer,
    device,
    location,
  });
};

export const getAnalyticsOverview = async (userId, days) => {
  try {
    const allowedDays = [7, 30, 90, 365];

    if (!allowedDays.includes(Number(days))) {
      throw new Error("Invalid days parameter");
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get all user links
    const userLinks = await Link.find({ userId }).select("_id");

    const linkIds = userLinks.map((link) => link._id);

    const totalLinks = linkIds.length;

    const linksInRange = await Link.countDocuments({
      userId,
      createdAt: { $gte: startDate },
    });

    if (totalLinks === 0) {
      return {
        overview: {
          totalLinks: 0,
          linksInRange: 0,
          totalClicks: 0,
          uniqueClicks: 0,
          clickRate: "0%",
        },
      };
    }

    const clicks = await Click.aggregate([
      {
        $match: {
          linkId: { $in: linkIds },
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: null,
          totalClicks: { $sum: 1 },
          uniqueIPs: { $addToSet: "$ip" },
        },
      },
    ]);

    const totalClicks = clicks[0]?.totalClicks || 0;
    const uniqueClicks = clicks[0]?.uniqueIPs?.length || 0;
    const clickRateValue = (totalClicks / totalLinks) * 100;
    return {
      overview: {
        totalLinks,
        linksInRange,
        totalClicks,
        uniqueClicks,
        clickRate: `${clickRateValue.toFixed(2)}%`,
      },
    };
  } catch (error) {
    throw new Error(error.message);
  }
};

const normalizeDeviceLabel = (device) => {
  const rawType = device?.device?.type;

  if (!rawType || rawType === "undefined") {
    return "Desktop";
  }

  return rawType.charAt(0).toUpperCase() + rawType.slice(1);
};

const getSourceLabel = (referer) => {
  if (!referer) return "Direct";

  try {
    return new URL(referer).hostname.replace(/^www\./, "");
  } catch {
    return "Direct";
  }
};

const formatRelativeTime = (date) => {
  const diffMs = Date.now() - new Date(date).getTime();
  const diffMinutes = Math.max(1, Math.round(diffMs / 60000));

  if (diffMinutes < 60) return `${diffMinutes} min ago`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hr ago`;

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
};

const allowedDays = [7, 30, 90, 365];

const normalizeExportDays = (days) => {
  if (!allowedDays.includes(Number(days))) {
    throw new Error("Invalid days parameter");
  }

  return Number(days);
};

const escapeCsv = (value) => {
  const normalized = value === null || value === undefined ? "" : String(value);
  return `"${normalized.replaceAll('"', '""')}"`;
};

const getDeviceLabel = (device) => normalizeDeviceLabel(device);

const getCountryLabel = (location) => location?.country || "Unknown";

const getSourceLabelFromClick = (referer) => getSourceLabel(referer);

const formatDateTime = (value) =>
  new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

const formatCompactDate = (value) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));

const drawCard = (doc, { x, y, width, label, value, accentColor }) => {
  doc.roundedRect(x, y, width, 64, 10).fillAndStroke("#ffffff", "#e5e7eb");
  doc.roundedRect(x, y, width, 5, 10).fill(accentColor);

  doc
    .fillColor("#6b7280")
    .fontSize(9)
    .text(label, x + 8, y + 10, {
      width: width - 16,
    });
  doc
    .fillColor("#111827")
    .fontSize(16)
    .font("Helvetica-Bold")
    .text(value, x + 8, y + 24, {
      width: width - 16,
    });
};
export const getAnalyticsExportData = async (userId, days) => {
  const periodDays = normalizeExportDays(days);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - periodDays);

  const userLinks = await Link.find({ userId, isDeleted: false })
    .select("_id alias longUrl shortUrl clicks createdAt")
    .lean();

  const linkMap = new Map(userLinks.map((link) => [String(link._id), link]));
  const linkIds = userLinks.map((link) => link._id);

  const clicks = linkIds.length
    ? await Click.find({
        linkId: { $in: linkIds },
        createdAt: { $gte: startDate },
      })
        .sort({ createdAt: -1 })
        .lean()
    : [];

  const totalLinks = userLinks.length;
  const totalClicks = clicks.length;
  const uniqueClicks = new Set(clicks.map((click) => click.ip)).size;
  const clickRateValue = totalLinks ? (totalClicks / totalLinks) * 100 : 0;

  const linkCounts = new Map();
  const countryCounts = new Map();
  const deviceCounts = new Map();

  const detailedClicks = clicks.map((click) => {
    const link = linkMap.get(String(click.linkId)) || {};
    const country = getCountryLabel(click.location);
    const device = getDeviceLabel(click.device);
    const source = getSourceLabelFromClick(click.referer);

    linkCounts.set(
      String(click.linkId),
      (linkCounts.get(String(click.linkId)) || 0) + 1,
    );
    countryCounts.set(country, (countryCounts.get(country) || 0) + 1);
    deviceCounts.set(device, (deviceCounts.get(device) || 0) + 1);

    return {
      timestamp: formatDateTime(click.createdAt),
      alias: link.alias || click.alias || "",
      shortUrl: link.shortUrl || "",
      longUrl: link.longUrl || "",
      country,
      city: click.location?.city || "",
      device,
      source,
      referer: click.referer || "",
    };
  });

  const toSortedList = (counts) =>
    [...counts.entries()]
      .sort(([, a], [, b]) => b - a)
      .map(([label, count]) => ({ label, count }));

  const topLinks = [...linkCounts.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([linkId, clicksCount]) => {
      const link = linkMap.get(linkId) || {};

      return {
        alias: link.alias || "Unknown",
        shortUrl: link.shortUrl || "",
        longUrl: link.longUrl || "",
        clicks: clicksCount,
      };
    });

  return {
    periodDays,
    generatedAt: new Date().toISOString(),
    overview: {
      totalLinks,
      totalClicks,
      uniqueClicks,
      clickRate: Number(clickRateValue.toFixed(2)),
    },
    topLinks,
    topCountries: toSortedList(countryCounts).slice(0, 5),
    topDevices: toSortedList(deviceCounts).slice(0, 5),
    detailedClicks,
  };
};

export const buildAnalyticsCsv = (exportData) => {
  const lines = [
    ["Amarlink Analytics Report"],
    ["Period", `${exportData.periodDays} days`],
    ["Generated at", formatCompactDate(exportData.generatedAt)],
    ["Total links", exportData.overview.totalLinks],
    ["Total clicks", exportData.overview.totalClicks],
    ["Unique clicks", exportData.overview.uniqueClicks],
    ["Click rate", `${exportData.overview.clickRate.toFixed(2)}%`],
    [],
    [
      "Timestamp",
      "Alias",
      "Short URL",
      "Long URL",
      "Country",
      "City",
      "Device",
      "Source",
      "Referer",
    ],
    ...exportData.detailedClicks.map((click) => [
      click.timestamp,
      click.alias,
      click.shortUrl,
      click.longUrl,
      click.country,
      click.city,
      click.device,
      click.source,
      click.referer,
    ]),
  ];

  return lines
    .map((row) => row.map((cell) => escapeCsv(cell)).join(","))
    .join("\n");
};

// export const createAnalyticsPdf = (res, exportData) => {
//   const doc = new PDFDocument({ size: "A4", margin: 30, bufferPages: true });

//   doc.pipe(res);

//   const m = doc.page.margins.left;
//   const pageBottom = doc.page.height - doc.page.margins.bottom;
//   const usableWidth = doc.page.width - m - doc.page.margins.right;

//   // Header
//   doc.rect(0, 0, doc.page.width, 80).fill("#2563eb");
//   doc
//     .fillColor("#ffffff")
//     .font("Helvetica-Bold")
//     .fontSize(18)
//     .text("Amarlink Analytics Report", m, 20);
//   doc
//     .font("Helvetica")
//     .fontSize(10)
//     .text(
//       `Period: last ${exportData.periodDays} days | Generated: ${formatDateTime(exportData.generatedAt)}`,
//       m,
//       48,
//     );

//   // Overview table instead of cards
//   let y = 90;
//   doc
//     .fillColor("#111827")
//     .font("Helvetica-Bold")
//     .fontSize(12)
//     .text("Overview", m, y);
//   y += 20;

//   drawTable(
//     doc,
//     [
//       { label: "Total Links", width: usableWidth * 0.25 },
//       { label: "Total Clicks", width: usableWidth * 0.25 },
//       { label: "Unique Clicks", width: usableWidth * 0.25 },
//       { label: "Click Rate", width: usableWidth * 0.25, align: "right" },
//     ],
//     [
//       [
//         String(exportData.overview.totalLinks),
//         String(exportData.overview.totalClicks),
//         String(exportData.overview.uniqueClicks),
//         `${exportData.overview.clickRate.toFixed(2)}%`,
//       ],
//     ],
//     { startY: y, headerHeight: 22, rowPadding: 10 },
//   );
//   y = doc.y;

//   // Top Links
//   y += 8;
//   doc
//     .fillColor("#111827")
//     .font("Helvetica-Bold")
//     .fontSize(12)
//     .text("Top Links", m, y);
//   y += 20;

//   drawTable(
//     doc,
//     [
//       { label: "Alias", width: usableWidth * 0.2 },
//       { label: "Clicks", width: usableWidth * 0.15, align: "right" },
//       { label: "Short URL", width: usableWidth * 0.3 },
//       { label: "Destination", width: usableWidth * 0.35 },
//     ],
//     exportData.topLinks.map((link) => [
//       link.alias,
//       String(link.clicks),
//       link.shortUrl,
//       link.longUrl,
//     ]),
//     { startY: y, headerHeight: 22 },
//   );
//   y = doc.y;

//   // Traffic Mix - only add new page if needed
//   y += 8;
//   if (y + 120 > pageBottom) {
//     doc.addPage();
//     y = doc.page.margins.top;
//   }

//   doc
//     .fillColor("#111827")
//     .font("Helvetica-Bold")
//     .fontSize(12)
//     .text("Traffic Mix", m, y);
//   y += 20;

//   // Countries table
//   drawTable(
//     doc,
//     [
//       { label: "Top Countries", width: usableWidth * 0.5 },
//       { label: "Count", width: usableWidth * 0.15, align: "right" },
//     ],
//     exportData.topCountries.map((item) => [item.label, String(item.count)]),
//     { startY: y, headerHeight: 22, rowPadding: 6 },
//   );
//   y = doc.y;

//   y += 8;

//   // Devices table
//   drawTable(
//     doc,
//     [
//       { label: "Top Devices", width: usableWidth * 0.5 },
//       { label: "Count", width: usableWidth * 0.15, align: "right" },
//     ],
//     exportData.topDevices.map((item) => [item.label, String(item.count)]),
//     { startY: y, headerHeight: 22, rowPadding: 6 },
//   );
//   y = doc.y;

//   // Recent Clicks - only add new page if needed
//   y += 8;
//   if (y + 200 > pageBottom) {
//     doc.addPage();
//     y = doc.page.margins.top;
//   }

//   doc
//     .fillColor("#111827")
//     .font("Helvetica-Bold")
//     .fontSize(12)
//     .text("Recent Clicks", m, y);
//   y += 8;

//   drawTable(
//     doc,
//     [
//       { label: "Timestamp", width: usableWidth * 0.2 },
//       { label: "Alias", width: usableWidth * 0.15 },
//       { label: "Country", width: usableWidth * 0.15 },
//       { label: "Device", width: usableWidth * 0.15 },
//       { label: "Source", width: usableWidth * 0.15 },
//       { label: "Referer", width: usableWidth * 0.2 },
//     ],
//     exportData.detailedClicks
//       .slice(0, 15)
//       .map((click) => [
//         click.timestamp,
//         click.alias,
//         click.country,
//         click.device,
//         click.source,
//         click.referer || "Direct",
//       ]),
//     { startY: y, headerHeight: 22 },
//   );
//   y = doc.y;

//   doc.end();
// };

export const getLinkAnalyticsOverview = async (userId, linkId, days, skipCheck = false) => {
  try {
    const allowedDays = [7, 30, 90, 365];

    if (!allowedDays.includes(Number(days))) {
      throw new Error("Invalid days parameter");
    }

    const link = await Link.findOne({
      _id: linkId,
      userId,
      isDeleted: false,
    }).lean();

    if (!link) {
      const error = new Error("Link not found");
      error.statusCode = 404;
      throw error;
    }

    if (!skipCheck && !link.isEnabledForReport) {
      const error = new Error("This link doesn't support any analytics");
      error.statusCode = 403;
      throw error;
    }

    const currentStart = new Date();
    currentStart.setDate(currentStart.getDate() - Number(days));

    const previousStart = new Date(currentStart);
    previousStart.setDate(previousStart.getDate() - Number(days));

    const [currentClicks, previousClicksCount] = await Promise.all([
      Click.find({
        linkId: link._id,
        createdAt: { $gte: currentStart },
      })
        .sort({ createdAt: -1 })
        .lean(),
      Click.countDocuments({
        linkId: link._id,
        createdAt: { $gte: previousStart, $lt: currentStart },
      }),
    ]);

    const totalClicks = currentClicks.length;
    const uniqueVisitors = new Set(currentClicks.map((click) => click.ip)).size;
    const avgClicksPerVisitor = uniqueVisitors
      ? Number((totalClicks / uniqueVisitors).toFixed(2))
      : 0;

    const deviceCounts = new Map();
    const sourceCounts = new Map();
    const countryCounts = new Map();
    const dailyCounts = new Map();

    currentClicks.forEach((click) => {
      const deviceLabel = normalizeDeviceLabel(click.device);
      const sourceLabel = getSourceLabel(click.referer);
      const countryLabel = click.location?.country || "Unknown";
      const dayKey = new Date(click.createdAt).toISOString().slice(0, 10);

      deviceCounts.set(deviceLabel, (deviceCounts.get(deviceLabel) || 0) + 1);
      sourceCounts.set(sourceLabel, (sourceCounts.get(sourceLabel) || 0) + 1);
      countryCounts.set(
        countryLabel,
        (countryCounts.get(countryLabel) || 0) + 1,
      );
      dailyCounts.set(dayKey, (dailyCounts.get(dayKey) || 0) + 1);
    });

    const toSortedList = (counts) =>
      [...counts.entries()]
        .sort(([, a], [, b]) => b - a)
        .map(([label, count]) => ({ label, count }));

    const deviceMix = toSortedList(deviceCounts).map((item) => ({
      ...item,
      share: totalClicks
        ? Number(((item.count / totalClicks) * 100).toFixed(1))
        : 0,
    }));

    const referrers = toSortedList(sourceCounts).map((item) => ({
      ...item,
      share: totalClicks
        ? Number(((item.count / totalClicks) * 100).toFixed(1))
        : 0,
    }));

    const sortedCountries = toSortedList(countryCounts);
    const activeRegions = countryCounts.size;
    const topCountry = sortedCountries[0]?.label || "Unknown";
    const topDevice = deviceMix[0]?.label || "Desktop";

    const trendDays = Math.min(Number(days), 7);
    const trend = Array.from({ length: trendDays }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (trendDays - 1 - index));
      const key = date.toISOString().slice(0, 10);

      return {
        label: date.toLocaleDateString("en-US", { weekday: "short" }),
        value: dailyCounts.get(key) || 0,
      };
    });

    const recentClicks = currentClicks.slice(0, 5).map((click) => ({
      time: formatRelativeTime(click.createdAt),
      country: click.location?.country || "Unknown",
      device: normalizeDeviceLabel(click.device),
      source: getSourceLabel(click.referer),
    }));

    const growthPercent = previousClicksCount
      ? Number(
          (
            ((totalClicks - previousClicksCount) / previousClicksCount) *
            100
          ).toFixed(1),
        )
      : totalClicks > 0
        ? 100
        : 0;

    return {
      link: {
        _id: link._id,
        alias: link.alias,
        longUrl: link.longUrl,
        shortUrl: link.shortUrl,
        clicks: link.clicks,
        createdAt: link.createdAt,
      },
      overview: {
        totalClicks,
        uniqueVisitors,
        avgClicksPerVisitor,
        activeRegions,
        topCountry,
        topDevice,
        growthPercent,
      },
      trend,
      deviceMix,
      referrers,
      recentClicks,
      periodDays: Number(days),
    };
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }

    throw new Error(error.message);
  }
};

export const getBestPerformingLinks = async (userId, subscriptionLimit) => {
  try {
    const bestLinks = await Link.find({ userId })
      .sort({ clicks: -1 })
      .limit(subscriptionLimit);
    return bestLinks;
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }

    throw new Error(error.message);
  }
};
