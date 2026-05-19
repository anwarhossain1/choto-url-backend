import Joi from "joi";

export const createReviewSchema = Joi.object({
  role: Joi.string().trim().min(2).max(80).required(),
  company: Joi.string().trim().min(2).max(120).required(),
  comment: Joi.string().trim().min(10).max(1000).required(),
  rating: Joi.number().integer().min(1).max(5).default(5),
  avatar: Joi.string().trim().uri().allow("", null).optional(),
});

export const reviewIdParamSchema = Joi.object({
  id: Joi.string().trim().length(24).hex().required(),
});
