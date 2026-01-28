import Link from "./schema.js";

export const createShortLink = async (payload) => {
  const { longUrl, alias, userId, guestId } = payload;
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
  });
};

export const getLinkByAlias = async (alias) => {
  return await Link.findOne({ alias });
};

export const updateLinkClicks = async (linkId) => {
  return await Link.updateOne({ _id: linkId }, { $inc: { clicks: 1 } });
};
