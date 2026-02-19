import Joi from "joi";

export const aliasSchema = Joi.object().keys({
  alias: Joi.string().min(3).required(),
});
