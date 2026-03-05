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

  const userAgent = req.headers["user-agent"];
  const referer = req.headers.referer || null;
  // Device info
  const parser = new UAParser(userAgent);
  const device = parser.getResult();
  // Location info
  const location = await getLocationFromIP(ip);

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

export const getBestPerformingLinks = async (userId, subscriptionLimit) => {
  try {
    const bestLinks = await Link.find({ userId })
      .sort({ clickCount: -1 })
      .limit(subscriptionLimit);
    return bestLinks;
  } catch (error) {
    throw new Error(error.message);
  }
};
