import mongoose from "mongoose";
import Click from "../analytics/schema.js";
import User from "../auth/schema.js";
import Link from "../links/schema.js";

export const getProfileData = async (userId) => {
  try {
    const objectUserId = new mongoose.Types.ObjectId(userId);
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const [user, linkStats, clickStats] = await Promise.all([
      // 👤 USER DATA
      User.findById(objectUserId)
        .select("-password -refreshTokens -__v")
        .lean(),

      // 🔗 LINK STATS
      Link.aggregate([
        { $match: { userId: objectUserId } },
        {
          $group: {
            _id: null,
            totalLinks: { $sum: 1 },
            linksThisMonth: {
              $sum: {
                $cond: [{ $gte: ["$createdAt", startOfMonth] }, 1, 0],
              },
            },
          },
        },
      ]),

      // 👆 CLICK STATS (real analytics)
      Click.aggregate([
        {
          $match: {
            createdAt: { $gte: startOfMonth },
          },
        },
        {
          $lookup: {
            from: "links",
            localField: "linkId",
            foreignField: "_id",
            as: "link",
          },
        },
        { $unwind: "$link" },
        {
          $match: {
            "link.userId": objectUserId,
          },
        },
        {
          $group: {
            _id: null,
            totalClicks: { $sum: 1 },
            totalClicksThisMonth: { $sum: 1 },
          },
        },
      ]),
    ]);

    return {
      ...user,
      totalLinks: linkStats[0]?.totalLinks || 0,
      linksThisMonth: linkStats[0]?.linksThisMonth || 0,
      totalClicksThisMonth: clickStats[0]?.totalClicksThisMonth || 0,
      totalClicks: clickStats[0]?.totalClicks || 0,
    };
  } catch (error) {
    throw new Error(error.message);
  }
};
