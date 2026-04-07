import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import redirectRoute from "./domains/links/redirectApi.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import routes from "./routes.js";

const app = express();

const allowedOrigins = [
  "https://www.amarlink.com",
  "http://localhost:3000",
  "https://amarlink.com",
];

const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS not allowed for origin: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(express.json());
app.use(helmet());
app.use(morgan("dev"));
app.use(cors(corsOptions));
app.use(cookieParser());

app.get("/", (req, res) => {
  res.redirect(302, `${env.frontendUrl}/`);
  res.send("Welcome to the Choto URL Service!");
});
app.get("/:alias", (req, res) => {
  res.redirect(302, `${env.frontendUrl}/404`);
});
app.use("/", redirectRoute);
app.use("/v1", routes);
app.use(errorHandler);

export default app;
