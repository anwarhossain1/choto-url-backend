import { randomUUID } from "crypto";
import { env } from "../../config/env.js";
import Link from "./schema.js";
export function generateQRCode(url) {
  // Using QR Server API for QR code generation
  const size = "200x200";
  const format = "png";
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}&format=${format}&data=${encodeURIComponent(
    url,
  )}`;
}

export const createShortLink = async (req, res) => {
  const { longUrl, alias } = req.body;
  let guestId = req?.cookies?.guestId;
  console.log("res", req.user);

  // If not logged in AND no guestId yet
  if (!req.user && !guestId) {
    guestId = randomUUID();
    res.cookie("guestId", guestId, {
      httpOnly: true, // not sensitive
      maxAge: 30 * 24 * 60 * 60 * 1000,
      sameSite: "lax",
      secure: env.nodeEnv === "development" ? false : true, // localhost only
    });
  }

  const shortUrl = `${env.baseUrl}/r/${alias}`;
  const qrCode = generateQRCode(shortUrl);
  const aliasExists = await Link.findOne({ alias });
  if (aliasExists) {
    throw new Error("Alias already in use");
  }
  return await Link.create({
    ownerType: req.user?.userId ? "User" : "Guest",
    userId: req.user?.userId || null,
    guestId: req.user ? null : guestId,
    alias,
    longUrl,
    shortUrl,
    qrCode,
  });
};

export const getLinkByAlias = async (alias) => {
  return await Link.findOne({ alias });
};

export const updateLinkClicks = async (linkId) => {
  return await Link.updateOne({ _id: linkId }, { $inc: { clicks: 1 } });
};
