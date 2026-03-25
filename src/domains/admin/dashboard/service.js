import User from "../../auth/schema.js";
import Link from "../../links/schema.js";
export const getAdminDashboardStats = async () => {
  // Run queries in parallel (important for performance) , , deletedLinks, totalClicksResult
  const [totalUsers, totalLinks, activeLinks, totalClicksResult] =
    await Promise.all([
      User.countDocuments(),
      Link.countDocuments(),
      Link.countDocuments({ isDeleted: false }),
      Link.aggregate([
        {
          $group: {
            _id: null,
            totalClicks: { $sum: "$clicks" },
          },
        },
      ]),
    ]);

  return {
    totalUsers,
    totalLinks,
    activeLinks,
    // deletedLinks,
    totalClicks: totalClicksResult[0]?.totalClicks || 0,
  };
};
