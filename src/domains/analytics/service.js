import fetch from "node-fetch";
import { UAParser } from "ua-parser-js";
import { env } from "../../config/env.js";
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
    console.log("da", data, res.body);
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
