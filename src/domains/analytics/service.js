import Click from "./schema.js";

export const trackClick = async ({ linkId, alias, req }) => {
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;

  const userAgent = req.headers["user-agent"];
  const referer = req.headers.referer || null;

  await Click.create({
    linkId,
    alias,
    ip,
    userAgent,
    referer,
  });
};
