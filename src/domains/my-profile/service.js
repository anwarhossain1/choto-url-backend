import mongoose from "mongoose";
import logger from "../../libraries/log/logger.js";
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
    logger.info(`get profile data of the user ${userId}`);
    return {
      ...user,
      totalLinks: linkStats[0]?.totalLinks || 0,
      linksThisMonth: linkStats[0]?.linksThisMonth || 0,
      totalClicksThisMonth: clickStats[0]?.totalClicksThisMonth || 0,
      totalClicks: clickStats[0]?.totalClicks || 0,
    };
  } catch (error) {
    logger.error(`${error.message} - User ID ${userId}`);
    throw new Error(error.message);
  }
};

export const changeUserName = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Name is required",
      });
    }

    await User.updateOne({ _id: userId }, { $set: { name } });
    logger.info("User name updated successfully");

    return res.json({
      success: true,
      message: "Name updated successfully",
    });
  } catch (error) {
    logger.error(error);
    next(error);
  }
};

export const changeEmail = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const { currentEmail, newEmail, currentPassword, confirmPassword } =
      req.body;

    if (!currentEmail || !newEmail || !currentPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const user = await User.findById(userId).select("+passwordHash");

    if (user.email !== currentEmail) {
      return res.status(400).json({
        success: false,
        message: "Current email is incorrect",
      });
    }
    if (currentPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Confirm password does not match",
      });
    }

    const isPasswordValid = await user.comparePassword(currentPassword);

    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: "Password is incorrect",
      });
    }

    await User.updateOne({ _id: userId }, { $set: { email: newEmail } });
    logger.info(`Email updated successfully - user id ${userId}`);

    return res.json({
      success: true,
      message: "Email updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Confirm password does not match",
      });
    }

    const user = await User.findById(userId).select("+passwordHash");

    const isPasswordValid = await user.comparePassword(currentPassword);

    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    await User.updateOne(
      { _id: userId },
      { $set: { passwordHash: confirmPassword } },
    );
    logger.info(`Password updated successfully - user id ${userId}`);
    return res.json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    logger.error(error);
    next(error);
  }
};
