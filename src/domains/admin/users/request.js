import Joi from "joi";

export const suspendUserSchema = Joi.object({
  reason: Joi.string().trim().max(500).allow("").optional(),
});

export const changeRoleSchema = Joi.object({
  role: Joi.string().valid("user", "admin").required(),
});

export const changeSubscriptionSchema = Joi.object({
  plan: Joi.string().valid("free", "starter", "professional", "enterprise").required(),
  status: Joi.string().valid("active", "trialing", "past_due", "canceled").optional(),
});
