import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import routes from "./routes.js";

const app = express();
app.use(express.json());
app.use(helmet());
// app.use(cors());
app.use(morgan("dev"));

app.get("/", (req, res) => {
  res.send("Welcome to the Choto URL Service!");
});
app.use(
  cors({
    origin: env.clientUrl,
    credentials: true,
  }),
);
app.use(cookieParser());
app.use("/api", routes);
app.use(errorHandler);

export default app;
