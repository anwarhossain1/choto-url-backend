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

export const createShortLink = async (payload) => {
  const { longUrl, alias, userId, guestId } = payload;
  const shortUrl = `${env.baseUrl}/${alias}`;
  const qrCode = generateQRCode(shortUrl);
  const aliasExists = await Link.findOne({ alias });
  if (aliasExists) {
    throw new Error("Alias already in use");
  }
  return await Link.create({
    ownerType: userId ? "User" : "Guest",
    userId: userId || null,
    guestId: guestId || null,
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
