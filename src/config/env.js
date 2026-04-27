import dotenv from "dotenv";

const envFile =
  process.env.NODE_ENV === "production"
    ? ".env.production"
    : ".env.development";

dotenv.config({ path: envFile });

export const env = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV,
  mongoUri: process.env.MONGO_URI,
  ipGeolocationApiKey: process.env.IP_GEOLOCATION_API_KEY,
  baseUrl: process.env.BASE_URL,
  accessTokenSecret: process.env.ACCESS_TOKEN_SECRET,
  refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET,
  clientUrl: process.env.CLIENT_URL,
  frontendUrl: process.env.FRONTEND_URL,
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  emailUser: process.env.EMAIL_USER,
  emailPass: process.env.EMAIL_PASS,
};
