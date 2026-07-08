export interface Office {
  id: string;
  name: string;
  title: string;
  hallway: "left" | "right";
  accentColor: string;
  path: string;
  existing: boolean;
}

export const OFFICES: Office[] = [
  // Left hallway (6 offices)
  { id: "atlas",  name: "Atlas",  title: "Chief AI Officer",      hallway: "left",  accentColor: "#c8a050", path: "/atlas",         existing: true  },
  { id: "nova",   name: "Nova",   title: "Research Lead",         hallway: "left",  accentColor: "#4a9eff", path: "/office/nova",   existing: false },
  { id: "sam",    name: "Sam",    title: "Engineering Director",   hallway: "left",  accentColor: "#4ade80", path: "/office/sam",    existing: false },
  { id: "morgan", name: "Morgan", title: "Design Principal",       hallway: "left",  accentColor: "#c084fc", path: "/office/morgan", existing: false },
  { id: "jordan", name: "Jordan", title: "Product Manager",        hallway: "left",  accentColor: "#f87171", path: "/office/jordan", existing: false },
  { id: "aria",   name: "Aria",   title: "Data Science Lead",      hallway: "left",  accentColor: "#fb923c", path: "/office/aria",   existing: false },
  // Right hallway (5 offices)
  { id: "finn",   name: "Finn",   title: "Automation Architect",   hallway: "right", accentColor: "#22d3ee", path: "/office/finn",   existing: false },
  { id: "quinn",  name: "Quinn",  title: "Creative Director",      hallway: "right", accentColor: "#e879f9", path: "/office/quinn",  existing: false },
  { id: "rio",    name: "Rio",    title: "Infrastructure Lead",    hallway: "right", accentColor: "#86efac", path: "/office/rio",    existing: false },
  { id: "sage",   name: "Sage",   title: "Strategy Director",      hallway: "right", accentColor: "#fbbf24", path: "/office/sage",   existing: false },
  { id: "kai",    name: "Kai",    title: "Innovation Officer",     hallway: "right", accentColor: "#818cf8", path: "/office/kai",    existing: false },
];

export function getHallwayOffices(side: string): Office[] {
  return OFFICES.filter(o => o.hallway === side);
}
