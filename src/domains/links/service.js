import Link from "../domains/links/schema.js";

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
