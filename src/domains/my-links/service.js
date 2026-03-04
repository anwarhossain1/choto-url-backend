import logger from "../../libraries/log/logger.js";
import { getPagination } from "../../utils/pagination.js";
import Link from "../links/schema.js";
export const getMyLinks = async (req, res) => {
  try {
    const userId = req.user.userId;
    const guestId = req.cookies.guestId;
    const { page, limit } = req.query;
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
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
    const skip = (pageNumber - 1) * limitNumber;
    const [links, total] = await Promise.all([
      Link.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber),

      Link.countDocuments({ userId }),
    ]);
    const pagination = getPagination({ page, limit, total });
    logger.info("Links fetched successfully");

    return {
      data: links,
      pagination,
    };
  } catch (error) {
    logger.error(error);
    throw new Error(error.message);
  }
};
