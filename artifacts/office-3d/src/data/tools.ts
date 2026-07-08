export interface SoftwareTool {
  id: string;
  name: string;
  url: string;
  category: string;
  color: string;
  description: string;
}

export const SOFTWARE_TOOLS: SoftwareTool[] = [
  { id: "chatgpt", name: "ChatGPT", url: "https://chat.openai.com", category: "AI", color: "#10a37f", description: "OpenAI's AI assistant" },
  { id: "claude", name: "Claude", url: "https://claude.ai", category: "AI", color: "#c07a4f", description: "Anthropic's AI assistant" },
  { id: "gemini", name: "Gemini", url: "https://gemini.google.com", category: "AI", color: "#4285f4", description: "Google's AI assistant" },
  { id: "notion", name: "Notion", url: "https://notion.so", category: "Productivity", color: "#000000", description: "All-in-one workspace" },
  { id: "slack", name: "Slack", url: "https://slack.com", category: "Communication", color: "#4a154b", description: "Team messaging" },
  { id: "figma", name: "Figma", url: "https://figma.com", category: "Design", color: "#f24e1e", description: "Collaborative design" },
  { id: "github", name: "GitHub", url: "https://github.com", category: "Development", color: "#24292e", description: "Code hosting" },
  { id: "jira", name: "Jira", url: "https://atlassian.com/jira", category: "Project", color: "#0052cc", description: "Issue tracking" },
  { id: "zapier", name: "Zapier", url: "https://zapier.com", category: "Automation", color: "#ff4a00", description: "App automation" },
  { id: "airtable", name: "Airtable", url: "https://airtable.com", category: "Database", color: "#18bfff", description: "Flexible database" },
  { id: "make", name: "Make", url: "https://make.com", category: "Automation", color: "#6d00cc", description: "Visual automation" },
  { id: "hubspot", name: "HubSpot", url: "https://hubspot.com", category: "CRM", color: "#ff7a59", description: "CRM platform" },
];

export const FURNITURE_PRESETS = [
  { id: "executive", label: "Executive", deskColor: "#3d2b1f", chairColor: "#1a1a1a", accentColor: "#8b6914" },
  { id: "modern", label: "Modern", deskColor: "#f0f0f0", chairColor: "#2c3e50", accentColor: "#3498db" },
  { id: "industrial", label: "Industrial", deskColor: "#4a4a4a", chairColor: "#2d2d2d", accentColor: "#e74c3c" },
  { id: "scandinavian", label: "Scandinavian", deskColor: "#d4b896", chairColor: "#6b8e6b", accentColor: "#c0956f" },
];

export const AGENT_PRESETS = [
  { id: "nova", name: "Nova", skinColor: "#f5cba7", shirtColor: "#2980b9", hairColor: "#4a3000", greeting: "Hi! I'm Nova. Click any poster to visit that tool!" },
  { id: "sam", name: "Sam", skinColor: "#c68642", shirtColor: "#27ae60", hairColor: "#1a0800", greeting: "Hey there! I'm Sam, your office guide. Click any tool to get started!" },
  { id: "morgan", name: "Morgan", skinColor: "#8d5524", shirtColor: "#8e44ad", hairColor: "#2c1810", greeting: "Welcome! I'm Morgan. Explore the tools on the walls!" },
  { id: "jordan", name: "Jordan", skinColor: "#fad7a0", shirtColor: "#e74c3c", hairColor: "#2c2c2c", greeting: "Hello! I'm Jordan. This office has all your favourite tools!" },
  { id: "custom", name: "Custom", skinColor: "#f5cba7", shirtColor: "#555555", hairColor: "#333333", greeting: "Hello! I'm your custom agent. Click any tool to launch it!" },
];
