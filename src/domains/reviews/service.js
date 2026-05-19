import mongoose from "mongoose";
import { getPagination } from "../../utils/pagination.js";
import User from "../auth/schema.js";
import Review from "./schema.js";

const toReviewPayload = (review) => ({
  _id: review._id,
  userId: review.userId,
  userEmail: review.userEmail,
  name: review.name,
  avatar: review.avatar,
  role: review.role,
  company: review.company,
  comment: review.comment,
  rating: review.rating,
  status: review.status,
  featuredBy: review.featuredBy,
  featuredAt: review.featuredAt,
  createdAt: review.createdAt,
  updatedAt: review.updatedAt,
});

export const submitReview = async (req) => {
  const userId = req.user.userId;
  const { role, company, comment, rating = 5, avatar = null } = req.body;

  const user = await User.findById(userId).select("name email avatar").lean();

  if (!user) {
    throw new Error("User not found");
  }

  const review = await Review.findOneAndUpdate(
    { userId: new mongoose.Types.ObjectId(userId) },
    {
      userId,
      userEmail: user.email,
      name: user.name,
      avatar: avatar || user.avatar || null,
      role,
      company,
      comment,
      rating,
      status: "pending",
      featuredBy: null,
      featuredAt: null,
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    },
  );

  return toReviewPayload(review.toObject());
};

export const getFeaturedReviews = async () => {
  const reviews = await Review.find({ status: "featured" })
    .sort({ featuredAt: -1, createdAt: -1 })
    .limit(6)
    .lean();

  return reviews.map(toReviewPayload);
};

export const getMyReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ userId: req.user.userId })
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      message: "My reviews fetched successfully",
      data: reviews.map(toReviewPayload),
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to fetch reviews",
      data: [],
    });
  }
};

export const getAdminReviews = async (req, res) => {
  const { page = 1, limit = 10, search = "", status = "all" } = req.query;
  const query = {};

  if (status && status !== "all") {
    query.status = status;
  }

  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const matcher = new RegExp(escaped, "i");
    query.$or = [
      { name: matcher },
      { userEmail: matcher },
      { role: matcher },
      { company: matcher },
      { comment: matcher },
      { status: matcher },
    ];
  }

  try {
    const [total, reviews] = await Promise.all([
      Review.countDocuments(query),
      Review.find(query)
        .sort({ featuredAt: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit, 10))
        .lean(),
    ]);

    const pagination = getPagination({ page, limit, total });

    return res.status(200).json({
      success: true,
      message: "Reviews fetched successfully",
      data: reviews.map(toReviewPayload),
      pagination,
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to fetch reviews",
      data: null,
    });
  }
};

export const featureReview = async (req, res) => {
  const { id } = req.params;

  try {
    const review = await Review.findById(id);

    if (!review) {
      throw new Error("Review not found");
    }

    review.status = "featured";
    review.featuredBy = req.user.userId;
    review.featuredAt = new Date();

    await review.save();

    return res.status(200).json({
      success: true,
      message: "Review featured successfully",
      data: toReviewPayload(review.toObject()),
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to feature review",
    });
  }
};

export const unfeatureReview = async (req, res) => {
  const { id } = req.params;

  try {
    const review = await Review.findById(id);

    if (!review) {
      throw new Error("Review not found");
    }

    review.status = "pending";
    review.featuredBy = null;
    review.featuredAt = null;

    await review.save();

    return res.status(200).json({
      success: true,
      message: "Review unfeatured successfully",
      data: toReviewPayload(review.toObject()),
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to unfeature review",
    });
  }
};
