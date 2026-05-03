import Joi from "joi";

const limitField = Joi.number().integer().min(0).allow(null);

const planIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const createPlanSchema = Joi.object({
  id: Joi.string().trim().lowercase().pattern(planIdPattern).optional().messages({
    "string.pattern.base":
      "id can only contain lowercase letters, numbers, and hyphens",
  }),
  name: Joi.string().trim().min(2).max(80).required(),
  priceMonthly: Joi.number().min(0).required(),
  priceYearly: Joi.number().min(0).allow(null).optional(),
  description: Joi.string().trim().max(500).allow(null, "").optional(),
  features: Joi.array().items(Joi.string().trim().min(1)).default([]),
  linksPerMonth: limitField.optional(),
  qrCodesPerMonth: limitField.optional(),
  analyticsLinksPerMonth: limitField.optional(),
  reportsLinksPerMonth: limitField.optional(),
  isPopular: Joi.boolean().optional(),
  isActive: Joi.boolean().optional(),
});

export const updatePlanSchema = Joi.object({
  id: Joi.string().trim().lowercase().pattern(planIdPattern).optional().messages({
    "string.pattern.base":
      "id can only contain lowercase letters, numbers, and hyphens",
  }),
  name: Joi.string().trim().min(2).max(80).optional(),
  priceMonthly: Joi.number().min(0).optional(),
  priceYearly: Joi.number().min(0).allow(null).optional(),
  description: Joi.string().trim().max(500).allow(null, "").optional(),
  features: Joi.array().items(Joi.string().trim().min(1)).optional(),
  linksPerMonth: limitField.optional(),
  qrCodesPerMonth: limitField.optional(),
  analyticsLinksPerMonth: limitField.optional(),
  reportsLinksPerMonth: limitField.optional(),
  isPopular: Joi.boolean().optional(),
  isActive: Joi.boolean().optional(),
})
  .min(1)
  .messages({
    "object.min": "At least one field is required to update a plan",
  });

export const planIdParamSchema = Joi.object({
  id: Joi.string().trim().required(),
});
