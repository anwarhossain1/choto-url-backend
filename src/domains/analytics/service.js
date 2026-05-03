import fetch from "node-fetch";
import { UAParser } from "ua-parser-js";
import { env } from "../../config/env.js";
import Link from "../links/schema.js";
import Click from "./schema.js";
const myHeaders = new Headers();
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

    if (totalLinks === 0) {
      return {
        overview: {
          totalLinks: 0,
          totalClicks: 0,
          uniqueClicks: 0,
          clickRate: 0,
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

export const getLinkAnalyticsOverview = async (userId, linkId, days) => {
  try {
    const allowedDays = [7, 30, 90, 365];

    if (!allowedDays.includes(Number(days))) {
      throw new Error("Invalid days parameter");
    }

    const link = await Link.findOne({ _id: linkId, userId, isDeleted: false }).lean();

    if (!link) {
      const error = new Error("Link not found");
      error.statusCode = 404;
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
      countryCounts.set(countryLabel, (countryCounts.get(countryLabel) || 0) + 1);
      dailyCounts.set(dayKey, (dailyCounts.get(dayKey) || 0) + 1);
    });

    const toSortedList = (counts) =>
      [...counts.entries()]
        .sort(([, a], [, b]) => b - a)
        .map(([label, count]) => ({ label, count }));

    const deviceMix = toSortedList(deviceCounts).map((item) => ({
      ...item,
      share: totalClicks ? Number(((item.count / totalClicks) * 100).toFixed(1)) : 0,
    }));

    const referrers = toSortedList(sourceCounts).map((item) => ({
      ...item,
      share: totalClicks ? Number(((item.count / totalClicks) * 100).toFixed(1)) : 0,
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
      ? Number((((totalClicks - previousClicksCount) / previousClicksCount) * 100).toFixed(1))
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
