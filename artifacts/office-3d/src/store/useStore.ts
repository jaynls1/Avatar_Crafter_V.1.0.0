import { create } from "zustand";
import { persist } from "zustand/middleware";
import { FURNITURE_PRESETS, AGENT_PRESETS } from "../data/tools";
import { getRoom } from "../lib/api";

interface AgentConfig {
  id: string;
  name: string;
  skinColor: string;
  shirtColor: string;
  hairColor: string;
  greeting: string;
}

interface FurnitureConfig {
  id: string;
  label: string;
  deskColor: string;
  chairColor: string;
  accentColor: string;
}

export interface ToolConfig {
  id: string;
  name: string;
  url: string;
  category: string;
  color: string;
  description: string;
}

interface StoreState {
  agentConfig: AgentConfig;
  furnitureConfig: FurnitureConfig;
  tools: ToolConfig[];
  roomSlug: string;
  isSpeaking: boolean;
  currentMessage: string;
  showSettings: boolean;
  apiLoaded: boolean;
  setAgent: (config: AgentConfig) => void;
  setFurniture: (config: FurnitureConfig) => void;
  setTools: (tools: ToolConfig[]) => void;
  setIsSpeaking: (val: boolean) => void;
  setCurrentMessage: (msg: string) => void;
  setShowSettings: (val: boolean) => void;
  speak: (text: string) => void;
  loadRoomFromApi: (slug?: string) => Promise<void>;
}

const DEFAULT_TOOLS: ToolConfig[] = [
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

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      agentConfig: AGENT_PRESETS[0],
      furnitureConfig: FURNITURE_PRESETS[0],
      tools: DEFAULT_TOOLS,
      roomSlug: "default",
      isSpeaking: false,
      currentMessage: "",
      showSettings: false,
      apiLoaded: false,

      setAgent: (config) => set({ agentConfig: config }),
      setFurniture: (config) => set({ furnitureConfig: config }),
      setTools: (tools) => set({ tools }),
      setIsSpeaking: (val) => set({ isSpeaking: val }),
      setCurrentMessage: (msg) => set({ currentMessage: msg }),
      setShowSettings: (val) => set({ showSettings: val }),

      speak: (text: string) => {
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.95;
        utterance.pitch = 1.1;
        utterance.volume = 1;
        set({ isSpeaking: true, currentMessage: text });
        utterance.onend = () => set({ isSpeaking: false, currentMessage: "" });
        window.speechSynthesis.speak(utterance);
      },

      loadRoomFromApi: async (slug = "default") => {
        try {
          const room = await getRoom(slug);
          set({
            agentConfig: room.agentConfig as AgentConfig,
            furnitureConfig: room.furnitureConfig as FurnitureConfig,
            tools: room.tools as ToolConfig[],
            roomSlug: slug,
            apiLoaded: true,
          });
        } catch {
          set({ apiLoaded: true });
        }
      },
    }),
    {
      name: "office-3d-store",
      partialize: (state) => ({
        agentConfig: state.agentConfig,
        furnitureConfig: state.furnitureConfig,
        tools: state.tools,
        roomSlug: state.roomSlug,
      }),
    }
  )
);
