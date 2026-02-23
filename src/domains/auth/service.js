import User from "./schema.js";

// import User from "./schema.js";
export const createUser = async (payload) => {
  const { name, password, email } = payload;
  const normalizedEmail = email.toLowerCase().trim();
  const userAlreadyExists = await User.findOne({ email: normalizedEmail });
  if (userAlreadyExists) {
    const error = new Error("Email already registered.");
    error.statusCode = 409;
    throw error;
  }
  try {
    const createdUser = await User.create({
      name,
      email: normalizedEmail,
      passwordHash: password, // pre-save will hash it
    });
    const user = await User.findById(createdUser._id); // passwordHash excluded
    return user;
  } catch (error) {
    if (err.code === 11000) {
      const error = new Error("Email already registered.");
      error.statusCode = 409;
      throw error;
    }
    throw error;
  }
};

export const loginUser = async (payload) => {};
