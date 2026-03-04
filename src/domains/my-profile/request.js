import Joi from "joi";

export const changeNameSchema = Joi.object({
  name: Joi.string().min(2).max(50).required().trim(),
});

export const changeEmailSchema = Joi.object({
  currentEmail: Joi.string().email().required(),
  newEmail: Joi.string().email().required(),
  currentPassword: Joi.string().min(6).required(),
  confirmPassword: Joi.string().min(6).required(),
});
export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().min(6).required(),
  newPassword: Joi.string().min(6).required(),
  confirmPassword: Joi.string().min(6).required(),
});
