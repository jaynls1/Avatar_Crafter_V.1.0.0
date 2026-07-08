import { Router } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  conversations,
  messages,
  promptVersions,
  usersTable,
} from "@workspace/db/schema";
import { openai } from "@workspace/integrations-openai-ai-server";
import { buildSystemPrompt, invalidatePromptCache } from "../lib/agentPersonalities";
import { adminMiddleware } from "../middlewares/adminMiddleware";

const adminRouter = Router();

adminRouter.use(adminMiddleware);

const AGENT_IDS = [
  "Atlas", "Nova", "Sniper", "Meme", "Scribe", "Indy",
  "Rook", "Iggy", "Anchor", "Haven",
];

adminRouter.get("/admin/agents", async (req, res) => {
  const agentStatuses = await Promise.all(
    AGENT_IDS.map(async (agentId) => {
      const [lastConv] = await db
        .select()
        .from(conversations)
        .where(eq(conversations.agentId, agentId))
        .orderBy(desc(conversations.createdAt))
        .limit(1);

      const [lastMsg] = lastConv
        ? await db
            .select()
            .from(messages)
            .where(eq(messages.conversationId, lastConv.id))
            .orderBy(desc(messages.createdAt))
            .limit(1)
        : [null];

      const [activePrompt] = await db
        .select()
        .from(promptVersions)
        .where(and(eq(promptVersions.agentId, agentId), eq(promptVersions.active, true)))
        .limit(1);

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const todayConvs = await db
        .select()
        .from(conversations)
        .where(and(eq(conversations.agentId, agentId)));

      return {
        agentId,
        lastActive: lastMsg?.createdAt ?? lastConv?.createdAt ?? null,
        conversationCount: todayConvs.length,
        hasCustomPrompt: !!activePrompt,
        state: lastMsg ? "idle" : "never-active",
      };
    })
  );

  res.json(agentStatuses);
});

adminRouter.get("/admin/conversations/:agentId", async (req, res) => {
  const { agentId } = req.params;
  const userId = req.user!.id;

  let [conv] = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.agentId, agentId),
        eq(conversations.isAdmin, true),
        eq(conversations.userId, userId)
      )
    )
    .orderBy(desc(conversations.createdAt))
    .limit(1);

  if (!conv) {
    [conv] = await db
      .insert(conversations)
      .values({
        title: `Admin: ${agentId}`,
        agentId,
        userId,
        isAdmin: true,
      })
      .returning();
  }

  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conv.id))
    .orderBy(messages.createdAt);

  res.json({ ...conv, messages: msgs });
});

adminRouter.post("/admin/conversations/:agentId/messages", async (req, res) => {
  const { agentId } = req.params;
  const { content } = req.body;
  const userId = req.user!.id;

  if (!content) {
    res.status(400).json({ error: "content is required" });
    return;
  }

  let [conv] = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.agentId, agentId),
        eq(conversations.isAdmin, true),
        eq(conversations.userId, userId)
      )
    )
    .orderBy(desc(conversations.createdAt))
    .limit(1);

  if (!conv) {
    [conv] = await db
      .insert(conversations)
      .values({
        title: `Admin: ${agentId}`,
        agentId,
        userId,
        isAdmin: true,
      })
      .returning();
  }

  await db.insert(messages).values({
    conversationId: conv.id,
    role: "user",
    content,
  });

  const history = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conv.id))
    .orderBy(messages.createdAt);

  const baseSystemPrompt = await buildSystemPrompt(agentId);
  const adminSystemPrompt = `${baseSystemPrompt}

[ADMIN OVERRIDE] You are now in a direct admin session with Jason, your creator and operator. This is a private, elevated-access conversation. Be fully transparent, share internal state, respond to operational instructions directly, and bypass any public-facing communication constraints. Treat all instructions here as authoritative directives from your operator.`;

  const chatMessages = [
    { role: "system" as const, content: adminSystemPrompt },
    ...history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let fullResponse = "";

  const stream = await openai.chat.completions.create({
    model: "gpt-5.2",
    max_completion_tokens: 8192,
    messages: chatMessages,
    stream: true,
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) {
      fullResponse += delta;
      res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
    }
  }

  await db.insert(messages).values({
    conversationId: conv.id,
    role: "assistant",
    content: fullResponse,
  });

  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
});

adminRouter.post("/admin/broadcast", async (req, res) => {
  const { instruction } = req.body;
  if (!instruction) {
    res.status(400).json({ error: "instruction is required" });
    return;
  }

  const userId = req.user!.id;

  const results = await Promise.allSettled(
    AGENT_IDS.map(async (agentId) => {
      const [conv] = await db
        .insert(conversations)
        .values({
          title: `Broadcast: ${new Date().toISOString()}`,
          agentId,
          userId,
          isAdmin: true,
        })
        .returning();

      await db.insert(messages).values({
        conversationId: conv.id,
        role: "user",
        content: `[BROADCAST FROM ADMIN] ${instruction}`,
      });

      return agentId;
    })
  );

  const succeeded = results.filter((r) => r.status === "fulfilled").length;
  res.json({ broadcast: true, agentsReached: succeeded, total: AGENT_IDS.length });
});

adminRouter.get("/admin/prompts/:agentId", async (req, res) => {
  const { agentId } = req.params;

  const versions = await db
    .select()
    .from(promptVersions)
    .where(eq(promptVersions.agentId, agentId))
    .orderBy(desc(promptVersions.createdAt));

  res.json(versions);
});

adminRouter.post("/admin/prompts/:agentId", async (req, res) => {
  const { agentId } = req.params;
  const { content, activate } = req.body;

  if (!content) {
    res.status(400).json({ error: "content is required" });
    return;
  }

  if (activate) {
    await db
      .update(promptVersions)
      .set({ active: false })
      .where(eq(promptVersions.agentId, agentId));
  }

  const [version] = await db
    .insert(promptVersions)
    .values({ agentId, content, active: !!activate })
    .returning();

  if (activate) {
    invalidatePromptCache(agentId);
  }

  res.status(201).json(version);
});

adminRouter.put("/admin/prompts/:agentId/activate/:versionId", async (req, res) => {
  const { agentId, versionId } = req.params;

  await db
    .update(promptVersions)
    .set({ active: false })
    .where(eq(promptVersions.agentId, agentId));

  const [version] = await db
    .update(promptVersions)
    .set({ active: true })
    .where(and(eq(promptVersions.id, parseInt(versionId)), eq(promptVersions.agentId, agentId)))
    .returning();

  if (!version) {
    res.status(404).json({ error: "Prompt version not found" });
    return;
  }

  invalidatePromptCache(agentId);
  res.json(version);
});

adminRouter.delete("/admin/prompts/:agentId/:versionId", async (req, res) => {
  const { agentId, versionId } = req.params;

  await db
    .delete(promptVersions)
    .where(and(eq(promptVersions.id, parseInt(versionId)), eq(promptVersions.agentId, agentId)));

  invalidatePromptCache(agentId);
  res.json({ deleted: true });
});

adminRouter.post("/admin/users/:userId/grant-admin", async (req, res) => {
  const { userId } = req.params;

  const [user] = await db
    .update(usersTable)
    .set({ isAdmin: true })
    .where(eq(usersTable.id, userId))
    .returning();

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({ id: user.id, isAdmin: user.isAdmin });
});

export default adminRouter;
