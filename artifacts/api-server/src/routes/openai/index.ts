import { Router, type Request } from "express";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { conversations, messages } from "@workspace/db/schema";
import { openai } from "@workspace/integrations-openai-ai-server";
import { buildSystemPrompt } from "../../lib/agentPersonalities";
import { scheduleNotionSync, scheduleClickUpScan } from "../../lib/memory-sync";
import { requireEntitlement } from "../../middlewares/entitlementGuard";
import {
  AUTHORIZATION_ORGANIZATION,
  canAccessConversationOwner,
  CAPABILITIES,
} from "../../middlewares/routeAuthorization";

const openaiRouter = Router();

function authenticatedMemberId(req: Request): string {
  if (!req.authorizationContext) {
    throw new Error("authorization_context_required");
  }
  return req.authorizationContext.userId;
}

function canAccessConversation(
  req: Request,
  conversation: { userId: string | null },
): boolean {
  return canAccessConversationOwner(
    authenticatedMemberId(req),
    conversation.userId,
  );
}

openaiRouter.use(
  "/openai/conversations",
  requireEntitlement(AUTHORIZATION_ORGANIZATION, CAPABILITIES.CONVERSATIONS_USE),
);

openaiRouter.post("/openai/conversations", async (req, res) => {
  const memberId = authenticatedMemberId(req);

  const { title, agentId } = req.body;
  if (!title || !agentId) {
    res.status(400).json({ error: "title and agentId are required" });
    return;
  }

  const [conversation] = await db
    .insert(conversations)
    .values({
      title,
      agentId,
      userId: memberId,
      isAdmin: req.user?.isAdmin === true,
    })
    .returning();

  res.status(201).json(conversation);
});

openaiRouter.get("/openai/conversations/:id", async (req, res) => {
  const memberId = authenticatedMemberId(req);

  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [conversation] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, id));

  if (!conversation || !canAccessConversation(req, conversation)) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(messages.createdAt);

  res.json({ ...conversation, messages: msgs });
});

openaiRouter.post("/openai/conversations/:id/messages", async (req, res) => {
  const memberId = authenticatedMemberId(req);

  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const { content } = req.body;
  if (!content) {
    res.status(400).json({ error: "content is required" });
    return;
  }

  const [conversation] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, id));

  if (!conversation || !canAccessConversation(req, conversation)) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  await db.insert(messages).values({
    conversationId: id,
    role: "user",
    content,
  });

  const history = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(messages.createdAt);

  const systemPrompt = await buildSystemPrompt(conversation.agentId, memberId, content);

  const chatMessages = [
    { role: "system" as const, content: systemPrompt },
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
    conversationId: id,
    role: "assistant",
    content: fullResponse,
  });

  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();

  scheduleNotionSync(id, conversation.agentId, conversation.title, memberId);
  scheduleClickUpScan(conversation.agentId, fullResponse, id);
});

export default openaiRouter;
