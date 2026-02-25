import Link from "../links/schema.js";
export const getMyLinks = async (req, res) => {
  const userId = req.user.userId;
  const guestId = req.cookies.guestId;
  if (guestId) {
    await Link.updateMany(
      {
        guestId: guestId,
        userId: null,
      },
      {
        $set: { userId: userId },
        $unset: { guestId: "" },
      },
    );
  }
  const links = await Link.find({
    userId: userId,
  }).sort({ createdAt: -1 });

  return links;
};
