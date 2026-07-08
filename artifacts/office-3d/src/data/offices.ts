export interface Office {
  id: string;
  name: string;
  title: string;
  hallway: "left" | "right";
  accentColor: string;
  path: string;
  isBreakroom?: boolean;
  breakroomUrl?: string;
}

export const OFFICES: Office[] = [
  // LEFT WING (Wing A) — 6 doors
  { id: "atlas",  name: "Atlas",  title: "Chief AI Officer",       hallway: "left",  accentColor: "#c8a050", path: "/atlas"        },
  { id: "nova",   name: "Nova",   title: "Workshop",               hallway: "left",  accentColor: "#4a9eff", path: "/office/nova"  },
  { id: "sniper", name: "Sniper", title: "Consulting Office",      hallway: "left",  accentColor: "#f87171", path: "/office/sniper"},
  { id: "meme",   name: "Meme",   title: "Creative Studio",        hallway: "left",  accentColor: "#e879f9", path: "/office/meme"  },
  { id: "scribe", name: "Scribe", title: "The Great Library",      hallway: "left",  accentColor: "#fbbf24", path: "/office/scribe"},
  { id: "indy",   name: "Indy",   title: "Creative Studio",        hallway: "left",  accentColor: "#86efac", path: "/office/indy"  },
  // RIGHT WING (Wing B) — 5 doors
  { id: "rook",   name: "Rook",   title: "Security Command",       hallway: "right", accentColor: "#22d3ee", path: "/office/rook"  },
  { id: "iggy",   name: "Iggy",   title: "Innovation Garage",      hallway: "right", accentColor: "#fb923c", path: "/office/iggy"  },
  { id: "anchor", name: "Anchor", title: "Mission Control",        hallway: "right", accentColor: "#818cf8", path: "/office/anchor"},
  { id: "haven",  name: "Haven",  title: "Sanctuary",              hallway: "right", accentColor: "#f9a8d4", path: "/office/haven" },
  { id: "breakroom", name: "Breakroom", title: "Take a breather",  hallway: "right", accentColor: "#4ade80", path: "/breakroom", isBreakroom: true, breakroomUrl: "https://example.com" },
];

export function getHallwayOffices(side: string): Office[] {
  return OFFICES.filter(o => o.hallway === side);
}
