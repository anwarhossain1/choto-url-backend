import logger from "../../libraries/log/logger.js";
import { getPagination } from "../../utils/pagination.js";
import Link from "../links/schema.js";
import Plan from "../admin/plans/schema.js";
import User from "../auth/schema.js";
export const getMyLinks = async (req) => {
  try {
    const userId = req.user.userId;
    const guestId = req.cookies.guestId;
    const { page, limit, search } = req.query;
    const pageNumber = parseInt(page) || 1;
    const limitNumber = parseInt(limit) || 10;
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
    const filter = { userId, isDeleted: false };
    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [
        { alias: regex },
        { shortUrl: regex },
        { longUrl: regex },
      ];
    }
    const skip = (pageNumber - 1) * limitNumber;
    const [links, total] = await Promise.all([
      Link.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber),
      Link.countDocuments(filter),
    ]);
    const pagination = getPagination({ page: pageNumber, limit: limitNumber, total });

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

export const setLinkReportAccess = async (userId, linkId, isEnabledForReport) => {
  const link = await Link.findOne({ _id: linkId, userId, isDeleted: false });
  if (!link) throw new Error("Link not found");

  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  if (isEnabledForReport) {
    const plan = await Plan.findOne({ id: user.subscription.plan });
    const limit = plan?.reportsLinksPerMonth;

    if (limit !== null && !link.isEnabledForReport) {
      const enabledCount = await Link.countDocuments({
        userId,
        isEnabledForReport: true,
        isDeleted: false,
      });

      if (enabledCount >= limit) {
        throw new Error(
          `Report access limit reached. You can enable up to ${limit} link${limit === 1 ? "" : "s"}.`,
        );
      }
    }
  } else {
    if (user.subscription.plan === "free") {
      throw new Error(
        "Free plan users cannot disable report access. Upgrade your plan to manage report links.",
      );
    }
  }

  link.isEnabledForReport = isEnabledForReport;
  await link.save();

  return {
    message: `Report access ${isEnabledForReport ? "enabled" : "disabled"} successfully`,
  };
};
