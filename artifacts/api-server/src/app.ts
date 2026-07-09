import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { authMiddleware } from "./middlewares/authMiddleware";
import router from "./routes";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const app: Express = express();

app.use(cors({ credentials: true, origin: true }));
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(authMiddleware);

app.use("/api", router);

db.execute(sql`
  CREATE TABLE IF NOT EXISTS memory_sync_log (
    id SERIAL PRIMARY KEY,
    agent_id TEXT NOT NULL,
    conversation_id INTEGER,
    notion_page_id TEXT,
    clickup_task_id TEXT,
    task_type TEXT NOT NULL DEFAULT 'notion',
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    status TEXT NOT NULL DEFAULT 'success',
    error_msg TEXT
  )
`).then(() =>
  Promise.all([
    db.execute(sql`ALTER TABLE memory_sync_log ADD COLUMN IF NOT EXISTS clickup_task_id TEXT`),
    db.execute(sql`ALTER TABLE memory_sync_log ADD COLUMN IF NOT EXISTS task_type TEXT NOT NULL DEFAULT 'notion'`),
  ])
).catch(() => {});

export default app;
