import Joi from "joi";

export const aliasSchema = Joi.object().keys({
  alias: Joi.string().min(3).required(),
});

export const createLinkSchema = Joi.object({
  longUrl: Joi.string()
    .uri({ scheme: ["http", "https"] })
    .required()
    .messages({
      "string.uri": "longUrl must be a valid URL",
      "any.required": "longUrl is required",
    }),

  alias: Joi.string().alphanum().min(3).max(30).required().messages({
    "string.alphanum": "Alias must contain only letters and numbers",
    "string.min": "Alias must be at least 3 characters",
    "string.max": "Alias must be at most 30 characters",
    "any.required": "Alias is required",
  }),
});
