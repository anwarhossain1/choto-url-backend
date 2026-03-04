import Joi from "joi";

export const changeNameSchema = Joi.object({
  name: Joi.string().min(2).max(50).required().trim(),
});
