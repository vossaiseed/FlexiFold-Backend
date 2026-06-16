import express from "express";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import routes from "./routes/index.js";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();

// credentials:true + an explicit origin are required for the browser to send
// and store the auth cookie on cross-origin requests.
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://flexi-fold-frontend.vercel.app",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.use("/api", routes);

app.use(errorHandler);

export default app;
