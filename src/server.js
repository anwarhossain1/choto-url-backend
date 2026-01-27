import app from "./app.js";
import connectDB from "./config/db.js";
import { env } from "./config/env.js";
const startServer = async () => {
  await connectDB();
  app.listen(env.PORT || 5000, () => {
    console.log(`Server is running on port ${env.PORT || 5000}`);
  });
};
startServer();
