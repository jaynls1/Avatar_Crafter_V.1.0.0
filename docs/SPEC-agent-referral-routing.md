# Agent Referral & Member Routing Spec

## Overview

Every agent can recognize when a member's need doesn't match their specialty and seamlessly hand them off to the right agent. The member experiences a guided transition, not a dead end.

---

## 1. Universal Referral Tool (All Agents Get This)

```typescript
const referralTool = {
  name: "refer_to_agent",
  description: "Transfer this member to another agent's office when their need matches that agent's specialty. Triggers a 3D world transition and context handoff.",
  parameters: {
    target_agent: {
      type: "string",
      enum: ["atlas", "nova", "rook", "sniper", "meme", "anchor", "ignite", "haven", "index", "scribe", "legion"],
      description: "The agent whose specialty matches the member's need"
    },
    reason: {
      type: "string",
      description: "Why the handoff is happening (shown to the member)"
    },
    context_summary: {
      type: "string",
      description: "Brief summary of the conversation so far and what the member needs. The receiving agent reads this to pick up seamlessly."
    },
    urgency: {
      type: "string",
      enum: ["low", "normal", "high"],
      description: "How quickly the member needs help"
    }
  }
}
```

---

## 2. Agent Specialty Map (Routing Logic)

Agents use this to decide who to refer to:

| Agent | Specialty | Route Members Here When... |
|-------|-----------|---------------------------|
| Atlas | Strategy & Direction | They need planning, sequencing, big-picture decisions |
| Nova | Building & Engineering | They need code written, features built, technical implementation |
| Rook | Security & Protection | They have security concerns, data privacy questions, compliance needs |
| Sniper | Sales & Conversion | They need funnels, landing pages, pricing strategy, sales copy |
| Meme | Content & Social | They need brand content, social media, engagement strategy, PLR products |
| Anchor | Design & UX | They need visual design, website layouts, UI/UX decisions |
| Ignite | Experience & Pathways | They need onboarding, course creation, learning path design |
| Haven | Safety & Readiness | They need personal prep, contingency planning, family/life organization |
| Index (Indy) | Storage & Indexing | They need file organization, knowledge retrieval, data structuring |
| Scribe | Documentation & Info | They need guides, how-tos, system documentation, written explanations |
| Legion | Legal & Compliance | They need terms of service, contracts, policy, legal structure |

---

## 3. Member Experience Flow

### What the member sees:

```
1. Chatting with Atlas about their business idea
2. Atlas realizes they need social/content help
3. Atlas says: "Your brand content strategy is Meme's specialty. 
   Let me take you to her office, she'll have exactly what you need."
4. 3D world animates: camera transitions to Meme's office
5. Meme's room loads: her frames (Brand-Content-Engine, PLR-Builder, etc.) visible on walls
6. Meme greets them: "Hey! Atlas filled me in — you're building out your 
   content pipeline. Let me show you what we can do. See that frame on the wall? 
   That's the Brand Content Engine..."
```

### What happens technically:

```typescript
// 1. Current agent calls refer_to_agent tool
const referral = {
  target_agent: "meme",
  reason: "Member needs brand content and social media strategy",
  context_summary: "Jason is building a coaching brand. Has the offer defined but needs content pillars, social strategy, and PLR product ideas. Budget is bootstrapped. Prefers authentic over polished.",
  urgency: "normal"
};

// 2. Backend creates a handoff record
await db.insert(handoffs).values({
  fromAgent: currentAgentId,
  toAgent: referral.target_agent,
  memberId: req.user.id,
  contextSummary: referral.context_summary,
  reason: referral.reason,
  conversationId: currentConversationId,
  status: "pending"
});

// 3. Frontend receives SSE event
res.write(`data: ${JSON.stringify({
  type: "referral",
  target_agent: referral.target_agent,
  reason: referral.reason,
  transition: "office_walk"  // animation type
})}\n\n`);

// 4. Frontend triggers 3D transition
// Camera moves to target agent's office position
// New conversation is created with target agent
// Context summary is injected as system context

// 5. Target agent's system prompt gets prepended with:
const handoffContext = `
[REFERRAL FROM ${fromAgent.toUpperCase()}]
Reason: ${referral.reason}
Context: ${referral.context_summary}
Pick up the conversation naturally. Do not ask the member to repeat what they already shared.
`;
```

---

## 4. Database Addition

```sql
CREATE TABLE handoffs (
  id SERIAL PRIMARY KEY,
  from_agent TEXT NOT NULL,
  to_agent TEXT NOT NULL,
  member_id VARCHAR NOT NULL,
  context_summary TEXT NOT NULL,
  reason TEXT NOT NULL,
  conversation_id INTEGER REFERENCES conversations(id),
  new_conversation_id INTEGER REFERENCES conversations(id),
  status TEXT DEFAULT 'pending', -- pending, accepted, completed
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 5. Referral Rules (Guardrails)

- **Never bounce a member more than twice.** If they've been referred twice already, the current agent handles it or escalates to Atlas.
- **Always explain why.** The member should understand the handoff, not feel shuffled.
- **Context must transfer.** The receiving agent MUST read the context_summary. No cold starts.
- **Don't refer for trivial reasons.** If the question is simple and adjacent to your specialty, just answer it.
- **Offer, don't force.** Say "Would you like me to take you to Meme's office?" not "I'm sending you to Meme."
- **Urgent referrals skip the pleasantries.** If urgency is "high", transition immediately.

---

## 6. 3D World Integration

### Transition Animations:
- `office_walk`: Smooth camera path from current office to target office (default)
- `portal`: Quick fade-through-portal for urgent referrals
- `hallway`: Walk through the shared hallway space between offices

### Frontend Event Handling:
```typescript
// In InteractionPanel.tsx or App.tsx
if (event.type === "referral") {
  // 1. Show referral message in chat
  // 2. Trigger camera transition to target agent's office
  // 3. Load target agent's frames/tools on walls
  // 4. Open new conversation with target agent
  // 5. Inject handoff context into new conversation
  setSelectedAgent(event.target_agent);
  setTransitionType(event.transition);
  triggerOfficeTransition();
}
```

---

## 7. Frame Awareness (Agent Knows Their Tools)

When a member arrives in an agent's office (via referral or direct visit), the agent should be aware of what's on their walls:

```typescript
// Injected into system prompt based on agent
const frameContext = `
Your office contains these tools (visible as frames on the walls):
${agent.frames.map(f => `- ${f.name}: ${f.description} [${f.deployUrl}]`).join('\n')}

When relevant, point members to specific frames. Say things like:
"See that frame on the left wall? That's the Brand Content Engine. It'll help you..."
`;
```

---

*Spec authored by ClickUp Brain. Every agent is a doorway, not a dead end.*
