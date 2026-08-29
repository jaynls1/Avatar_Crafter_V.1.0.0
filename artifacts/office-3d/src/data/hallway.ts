export interface MemberSuccess {
  id: string;
  memberName: string;
  caption: string;
  image?: string;
  url?: string;
  wing: "left" | "right";
}

export function getSafeExternalUrl(value?: string): string | null {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" ? parsed.href : null;
  } catch {
    return null;
  }
}

export const MEMBER_SUCCESS_STORIES: MemberSuccess[] = [
  // Replace these reserved entries with approved member names, captions, images, and links.
  { id: "a1", memberName: "Member Story Coming Soon", caption: "This frame is reserved for an approved NEXT member success story.", wing: "left" },
  { id: "a2", memberName: "Member Story Coming Soon", caption: "Add an approved photo and story link to feature a member here.", wing: "left" },
  { id: "a3", memberName: "Member Story Coming Soon", caption: "This gallery space is ready for a future member spotlight.", wing: "left" },
  { id: "a4", memberName: "Member Story Coming Soon", caption: "No story has been published in this frame yet.", wing: "left" },

  { id: "b1", memberName: "Member Story Coming Soon", caption: "This frame is reserved for an approved NEXT member success story.", wing: "right" },
  { id: "b2", memberName: "Member Story Coming Soon", caption: "Add an approved photo and story link to feature a member here.", wing: "right" },
  { id: "b3", memberName: "Member Story Coming Soon", caption: "This gallery space is ready for a future member spotlight.", wing: "right" },
  { id: "b4", memberName: "Member Story Coming Soon", caption: "No story has been published in this frame yet.", wing: "right" },
];

export interface GratitudeEntry {
  id: string;
  name: string;
  note: string;
  logo: string;
  url: string;
  accentColor: string;
}

export const GRATITUDE_ENTRIES: GratitudeEntry[] = [
  { id: "replit", name: "Replit", note: "For powering the canvas of our imagination.", logo: "/gratitude/replit.svg", url: "https://replit.com/about", accentColor: "#F26207" },
  { id: "clickup", name: "ClickUp", note: "For organizing our chaos into clarity.", logo: "/gratitude/clickup.svg", url: "https://clickup.com/about", accentColor: "#7B68EE" },
  { id: "openai", name: "OpenAI", note: "For giving our agents a mind of their own.", logo: "/gratitude/openai.svg", url: "https://openai.com/about/", accentColor: "#10A37F" },
  { id: "google", name: "Google", note: "For connecting us to the world's knowledge.", logo: "/gratitude/google.svg", url: "https://about.google/", accentColor: "#4285F4" },
  { id: "notion", name: "Notion", note: "For the space to document our shared mind.", logo: "/gratitude/notion.svg", url: "https://www.notion.com/about", accentColor: "#CCCCCC" },
  { id: "mastermind", name: "Mastermind", note: "For elevating our collective intelligence.", logo: "/gratitude/mastermind.svg", url: "https://mastermind.com/", accentColor: "#C8A050" },
  { id: "markjoyner", name: "Mark Joyner", note: "For pioneering the digital frontier.", logo: "/gratitude/markjoyner.svg", url: "https://markjoyner.com/", accentColor: "#5080C8" },
  { id: "simpleology", name: "Simpleology", note: "For simplifying the path to success.", logo: "/gratitude/simpleology.svg", url: "https://simpleology.com", accentColor: "#E84C3D" },
  { id: "facebook", name: "Facebook", note: "For building the communities we cherish.", logo: "/gratitude/facebook.svg", url: "https://about.meta.com/technologies/facebook-app/", accentColor: "#1877F2" },
  { id: "tiktok", name: "TikTok", note: "For inspiring authentic creative expression.", logo: "/gratitude/tiktok.svg", url: "https://www.tiktok.com/about", accentColor: "#FF0050" },
  { id: "linkedin", name: "LinkedIn", note: "For fostering professional growth and trust.", logo: "/gratitude/linkedin.svg", url: "https://about.linkedin.com/", accentColor: "#0A66C2" },
];
