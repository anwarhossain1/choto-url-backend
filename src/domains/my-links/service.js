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
      Link.find({ userId, isDeleted: false })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber),
      Link.countDocuments({ userId, isDeleted: false }),
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

/**
 * Soft delete link
 */
export const softDeleteLink = async (userId, linkId) => {
  const link = await Link.findOne({ _id: linkId, userId, isDeleted: false });
  if (!link) throw new Error("Link not found or already deleted");

  link.isDeleted = true;
  link.deletedAt = new Date();
  await link.save();

  return { message: "Link deleted successfully" };
};

/**
 * Hard delete link
 */
export const hardDeleteLink = async (userId, linkId) => {
  const link = await ShortLink.findOne({ _id: linkId, userId });
  if (!link) throw new Error("Link not found");

  await ShortLink.deleteOne({ _id: linkId, userId });

  return { message: "Link permanently deleted" };
};

/**
 * Restore soft deleted link
 */
export const restoreLink = async (userId, linkId) => {
  const link = await Link.findOne({ _id: linkId, userId, isDeleted: true });
  if (!link) throw new Error("Link not found or not deleted");

  link.isDeleted = false;
  link.deletedAt = null;
  await link.save();

  return { message: "Link restored successfully" };
};
