import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import rateLimit from "express-rate-limit";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

const isProd = process.env.NODE_ENV === "production";

app.use(
  cors({
    origin: isProd
      ? (process.env.ALLOWED_ORIGINS ?? "").split(",").filter(Boolean)
      : true,
    credentials: true,
  }),
);

// General write rate limit — 60 write requests per minute per IP
const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests — please slow down." },
  skip: (req) => req.method === "GET" || req.method === "HEAD",
});

// Stricter AI message rate limit — 20 messages per minute per IP
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many AI requests — please wait a moment." },
});

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply AI limiter to conversation messages only
app.use("/api/conversations/:id/messages", aiLimiter);

// Apply general write limiter to all other write endpoints
app.use("/api", writeLimiter);

app.use("/api", router);

export default app;
