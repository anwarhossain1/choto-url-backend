import Joi from "joi";

export const adminLinkIdParamSchema = Joi.object({
  id: Joi.string().trim().length(24).hex().required(),
});

export const adminLinksQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  search: Joi.string().trim().allow("", null).default(""),
  status: Joi.string().valid("all", "active", "inactive", "deleted").default("all"),
  ownerType: Joi.string().valid("all", "user", "guest").default("all"),
});

export const bulkAdminLinksSchema = Joi.object({
  ids: Joi.array().items(Joi.string().trim().length(24).hex()).min(1).required(),
  action: Joi.string()
    .valid("activate", "deactivate", "delete", "restore", "hardDelete")
    .required(),
});
