import dotenv from "dotenv";
dotenv.config();
export const env = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV,
  mongoUri: process.env.MONGO_URI,
  ipGeolocationApiKey: process.env.IP_GEOLOCATION_API_KEY,
};
