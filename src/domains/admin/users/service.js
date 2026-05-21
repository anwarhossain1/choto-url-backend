import mongoose from "mongoose";
import User from "../../auth/schema.js";
import Link from "../../links/schema.js";
const buildSearchMatch = (search) => {
  if (!search) return null;

  const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(escaped, "i");

  return {
    $or: [
      { name: regex },
      { email: regex },
      { role: regex },
      { subscriptionPlan: regex },
      { "subscription.plan": regex },
      { "subscription.status": regex },
    ],
  };
};

const buildDateMatch = ({ range, year }) => {
  const yearNumber = Number.parseInt(year, 10);
  const rangeNumber = Number.parseInt(range, 10);
  const hasYear = Number.isFinite(yearNumber);
  const hasRange = Number.isFinite(rangeNumber) && rangeNumber > 0 && rangeNumber < 365;

  if (!hasYear && !hasRange) return null;

  const now = new Date();
  const yearStart = hasYear ? new Date(yearNumber, 0, 1) : null;
  const yearEnd = hasYear ? new Date(yearNumber + 1, 0, 1) : null;

  if (hasRange) {
    const anchorEnd = hasYear
      ? yearNumber === now.getFullYear()
        ? now
        : new Date(yearNumber + 1, 0, 1)
      : now;
    const rangeEnd = hasYear && yearEnd < anchorEnd ? yearEnd : new Date(anchorEnd);
    const rangeStart = new Date(rangeEnd);
    rangeStart.setDate(rangeStart.getDate() - rangeNumber + 1);

    return {
      $gte: hasYear && yearStart > rangeStart ? yearStart : rangeStart,
      $lt: hasYear ? rangeEnd : new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
    };
  }

  return {
    $gte: yearStart,
    $lt: yearEnd,
  };
};

export const getAllUsers = async ({ page = 1, limit = 10, search = "", range = "30", year } = {}) => {
  try {
    const pageNumber = Number.parseInt(page, 10) || 1;
    const limitNumber = Number.parseInt(limit, 10) || 10;
    const skip = (pageNumber - 1) * limitNumber;

    const andConditions = [];
    const searchMatch = buildSearchMatch(String(search).trim());
    const dateMatch = buildDateMatch({ range, year });

    if (searchMatch) andConditions.push(searchMatch);
    if (dateMatch) andConditions.push({ createdAt: dateMatch });

    const query = andConditions.length ? { $and: andConditions } : {};

    const [users, total] = await Promise.all([
      User.find(query, "-passwordHash -__v")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber)
        .lean(),
      User.countDocuments(query),
    ]);

    return {
      users,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        skip,
        total,
        totalPages: Math.ceil(total / limitNumber) || 1,
      },
    };
  } catch (error) {
    throw new Error("Failed to fetch users");
  }
};

export const getUserById = async (userId) => {
  try {
    const user = await User.findById(userId, "-passwordHash -refreshTokens -__v").lean();
    if (!user) throw new Error("User not found");
    return user;
  } catch (error) {
    throw new Error(error.message || "Failed to fetch user");
  }
};

export const getUserLinks = async (userId) => {
  try {
    const objectId = new mongoose.Types.ObjectId(userId);
    const links = await Link.find({
      $or: [{ userId: objectId }, { userId: userId }],
    })
      .sort({ createdAt: -1 })
      .lean();
    return links;
  } catch (error) {
    throw new Error(error.message || "Failed to fetch user links");
  }
};

export const suspendUser = async (userId, reason = "") => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");
  if (user.role === "admin") throw new Error("Cannot suspend an admin user");

  user.isActive = false;
  user.suspendedAt = new Date();
  user.suspensionReason = reason;
  await user.save();

  const { passwordHash, refreshTokens, ...safe } = user.toObject();
  return safe;
};

export const activateUser = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  user.isActive = true;
  user.suspendedAt = null;
  user.suspensionReason = null;
  await user.save();

  const { passwordHash, refreshTokens, ...safe } = user.toObject();
  return safe;
};

export const changeUserRole = async (userId, role) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");
  if (role === "admin" && user.role === "admin") throw new Error("User is already an admin");
  if (role === "user" && user.role === "user") throw new Error("User is already a regular user");

  user.role = role;
  await user.save();

  const { passwordHash, refreshTokens, ...safe } = user.toObject();
  return safe;
};

export const changeUserSubscription = async (userId, { plan, status }) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  user.subscription.plan = plan;
  if (status) user.subscription.status = status;
  await user.save();

  const { passwordHash, refreshTokens, ...safe } = user.toObject();
  return safe;
};

export const verifyUserEmail = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");
  if (user.isEmailVerified) throw new Error("Email is already verified");

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  await user.save();

  const { passwordHash, refreshTokens, ...safe } = user.toObject();
  return safe;
};

export const forceLogoutUser = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  user.tokenVersion += 1;
  user.refreshTokens = [];
  await user.save();

  const { passwordHash, refreshTokens, ...safe } = user.toObject();
  return safe;
};

export const deleteUser = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");
  if (user.role === "admin") throw new Error("Cannot delete an admin user");

  // Delete all user's links and click data
  const userLinks = await Link.find({ userId }).lean();
  const linkIds = userLinks.map((l) => l._id);
  if (linkIds.length > 0) {
    await Click.deleteMany({ linkId: { $in: linkIds } });
    await Link.deleteMany({ _id: { $in: linkIds } });
  }

  // Delete user's refresh tokens and remove user
  user.refreshTokens = [];
  await User.deleteOne({ _id: userId });

  return { deletedUserId: userId, deletedLinks: linkIds.length };
};
