import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";
import router from "./routes";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { credentialedCorsOptions } from "./lib/corsPolicy";

const app: Express = express();

app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

app.use(cors(credentialedCorsOptions()));
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Resolve the publishable key from the incoming request host so the same
// server can serve multiple Clerk custom domains. Falls back to
// CLERK_PUBLISHABLE_KEY when the host doesn't map to a custom domain.
//
// getClerkProxyHost is shared with clerkProxyMiddleware so that both
// halves of the auth setup agree on which hostname is canonical.
app.use(
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
  })),
);

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
