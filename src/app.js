import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { errorHandler } from "./middlewares/errorHandler.js";
import routes from "./routes.js";
const app = express();

app.use(express.json());
app.use(helmet());
app.use(cors());
app.use(morgan("dev"));

app.use("/api", routes);
app.get("/", (req, res) => {
  res.send("Welcome to the Choto URL Service!");
});
app.use(errorHandler);

export default app;
