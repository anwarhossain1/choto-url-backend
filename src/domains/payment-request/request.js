import Joi from "joi";

export const paymentRequestIdParamSchema = Joi.object({
  id: Joi.string().trim().length(24).hex().required(),
});

export const rejectPaymentRequestSchema = Joi.object({
  rejectedReason: Joi.string().trim().min(3).max(300).required(),
  adminNote: Joi.string().trim().max(300).allow("", null).optional(),
});
