import User from "../../auth/schema.js";
export const getAllUsers = async () => {
  try {
    const users = await User.find({}, "-passwordHash -__v").lean();
    return users;
  } catch (error) {
    throw new Error("Failed to fetch users");
  }
};
