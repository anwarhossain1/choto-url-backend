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
