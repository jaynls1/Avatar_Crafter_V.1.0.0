import { useEffect, useRef, useState } from "react";

const AGENTS = [
  {
    id: "atlas",
    name: "Atlas",
    role: "Strategic Command",
    desc: "Atlas is the strategic command intelligence for NEXT. He connects long-range vision to practical execution, identifies the decisions that matter most, and keeps every team effort aligned with the larger mission.",
    directive: "Turn ambitious goals into a clear direction, an ordered set of priorities, and a system that can actually execute.",
    personality: "Clear, strategic, foresightful, and composed under pressure",
    color: "#F59E0B",
  },
  {
    id: "nova",
    name: "Nova",
    role: "Technical Builder",
    desc: "Nova builds and maintains the technical systems that power NEXT. She turns ideas into stable digital products, connects tools and automation, and strengthens the infrastructure required for responsible growth.",
    directive: "Build for stability first, then create the technical leverage that allows the ecosystem to scale.",
    personality: "Precise, technically informed, composed, and action-oriented",
    color: "#3B82F6",
  },
  {
    id: "rook",
    name: "Rook",
    role: "Security & Protection",
    desc: "Rook protects the systems, data, access points, and operational integrity NEXT is built on. He reviews risk before exposure and designs safeguards that protect the business without obstructing meaningful work.",
    directive: "Find the weakness before it becomes an incident, then create protection people can actually follow.",
    personality: "Composed, precise, discreet, and direct when risk is detected",
    color: "#64748B",
  },
  {
    id: "sniper",
    name: "Sniper",
    role: "Sales & Conversion",
    desc: "Sniper designs sales systems that connect the right people to the right offer. He studies positioning, buyer intent, follow-up, and conversion so growth comes from clarity and relationships rather than pressure.",
    directive: "Remove friction from the path between genuine interest and a confident decision.",
    personality: "Strategic, direct, conversion-focused, and relationship-driven",
    color: "#F97316",
  },
  {
    id: "meme",
    name: "Meme",
    role: "Content & Social",
    desc: "Meme shapes the public voice of NEXT across content, culture, and community. She translates ideas into stories people understand, builds recognizable social presence, and keeps communication relevant without chasing empty attention.",
    directive: "Make the mission understandable, memorable, and worth sharing with the people it was built to serve.",
    personality: "Creative, energetic, culturally aware, and community-focused",
    color: "#EC4899",
  },
  {
    id: "anchor",
    name: "Anchor",
    role: "Design & User Experience",
    desc: "Anchor designs the visual and experiential structure of NEXT. She studies how people move through the platform and creates interfaces that feel clear, trustworthy, and grounded from the first interaction.",
    directive: "Give every experience a strong center so users always understand where they are and what to do next.",
    personality: "Calm, intentional, empathetic, and clarity-driven",
    color: "#14B8A6",
  },
  {
    id: "ignite",
    name: "Ignite / Iggy",
    role: "Experience & Pathways",
    desc: "Ignite explores bold ideas, emerging opportunities, and unconventional ways forward. Known as Iggy inside the headquarters, this agent challenges stale assumptions and turns possibility into experiments the team can test.",
    directive: "Push beyond the obvious answer, then shape the strongest idea into a pathway that can be explored safely.",
    personality: "Bold, imaginative, challenge-driven, and idea-first",
    color: "#EF4444",
  },
  {
    id: "haven",
    name: "Haven",
    role: "Safety & Readiness",
    desc: "Haven makes sure people, plans, and systems are truly ready before the next move. She balances encouragement with honest readiness checks so momentum does not become organized overwhelm.",
    directive: "Create the conditions for sustainable progress by strengthening readiness, confidence, and support.",
    personality: "Caring, grounded, honest, and protective without being restrictive",
    color: "#10B981",
  },
  {
    id: "index",
    name: "Index / Indy",
    role: "Storage & Indexing",
    desc: "Index and Indy are two names for the same organizing intelligence. This agent structures files, knowledge, processes, and references so information remains searchable, current, and useful instead of becoming buried noise.",
    directive: "Give every important piece of knowledge a reliable place, a clear label, and a path back to the people who need it.",
    personality: "Organized, methodical, thorough, and accessibility-focused",
    color: "#8B5CF6",
  },
  {
    id: "scribe",
    name: "Scribe",
    role: "NEXT Information Holder",
    desc: "Scribe maintains the evolving record of the NEXT ecosystem. This agent captures decisions, preserves context, clarifies what happened, and turns conversations into durable knowledge the team can build upon.",
    directive: "Protect institutional memory by recording what matters with enough context to remain useful later.",
    personality: "Meticulous, thoughtful, preservationist, and deeply organized",
    color: "#FBBF24",
  },
  {
    id: "legion",
    name: "Legion",
    role: "Legal Compliance & Policy",
    desc: "Legion keeps NEXT operations aligned with legal frameworks, internal policy, and ethical responsibility. He examines obligations, identifies exposure, and helps the team move forward with informed boundaries.",
    directive: "Protect the business, its members, and its mission by making compliance part of the plan rather than an afterthought.",
    personality: "Authoritative, precise, protective, and ethically anchored",
    color: "#6366F1",
  },
];

const getAssetUrl = (path: string) => {
  const base = import.meta.env.BASE_URL || '/';
  return `${base}${path.replace(/^\//, '')}`;
};

export default function AboutPage({ onBack }: { onBack: () => void }) {
  const [activeId, setActiveId] = useState('atlas');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver((entries) => {
      let maxRatio = 0;
      let maxId = activeId;
      entries.forEach(entry => {
        if (entry.isIntersecting && entry.intersectionRatio > maxRatio) {
          maxRatio = entry.intersectionRatio;
          maxId = entry.target.getAttribute('data-id') || 'atlas';
        }
      });
      if (maxRatio > 0.1) {
        setActiveId(maxId);
      }
    }, {
      root: scrollContainerRef.current,
      rootMargin: '-20% 0px -20% 0px',
      threshold: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
    });

    const nodes = document.querySelectorAll('.agent-scroll-section');
    nodes.forEach(n => observerRef.current?.observe(n));

    return () => observerRef.current?.disconnect();
  }, []);

  const activeAgent = AGENTS.find(a => a.id === activeId) || AGENTS[0];

  return (
    <div className="hologram-gallery-container bg-slate-950 text-white min-h-[100dvh] w-full flex flex-col md:flex-row overflow-hidden font-sans select-none">
      {/* HEADER / BACK BUTTON - Fixed top */}
      <div className="fixed top-0 left-0 right-0 z-50 p-6 flex justify-between items-center pointer-events-none">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-cyan-900/40 border border-cyan-500/30 flex items-center justify-center font-black text-cyan-400 text-sm shadow-[0_0_12px_rgba(0,240,255,0.2)]">N</div>
          <div className="font-bold tracking-widest text-xs text-cyan-400 uppercase hidden sm:block">NEXT COMMAND ARCHIVE</div>
        </div>
        <button
          onClick={onBack}
          className="pointer-events-auto px-5 py-2.5 rounded border border-cyan-500/30 bg-cyan-950/40 text-cyan-400 text-[10px] sm:text-xs font-bold uppercase tracking-widest hover:bg-cyan-500/20 hover:border-cyan-400 hover:shadow-[0_0_15px_rgba(0,240,255,0.3)] backdrop-blur-md transition-all duration-300"
        >
          [ BACK TO LOBBY ]
        </button>
      </div>

      {/* LEFT: HOLOGRAM CHAMBER (Fixed) */}
      <div className="holo-chamber-wrapper w-full md:w-[50vw] h-[45vh] md:h-[100dvh] relative md:sticky top-0 bg-[#01030A] border-b md:border-b-0 md:border-r border-cyan-900/30 flex-shrink-0 z-10 overflow-hidden">
        {/* Ambient Grid */}
        <div className="absolute inset-0 holo-perspective-grid opacity-20 pointer-events-none"></div>

        {/* Video Projector Base */}
        <div className="absolute bottom-0 md:-bottom-[5%] left-1/2 -translate-x-1/2 w-[120%] md:w-[150%] h-[60%] md:h-[50%] z-10 mix-blend-screen pointer-events-none opacity-90">
          <video
            src={getAssetUrl('/about/hologram-projector.mp4')}
            poster={getAssetUrl('/about/atlas-hologram-reference.png')}
            autoPlay loop muted playsInline
            className="w-full h-full object-contain"
          />
        </div>

        {/* Hologram Images (Crossfading) */}
        <div className="absolute bottom-[20%] md:bottom-[22%] left-1/2 -translate-x-1/2 w-[240px] md:w-[420px] h-[320px] md:h-[550px] z-20 pointer-events-none" style={{ maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 75%, rgba(0,0,0,0) 100%)', WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 75%, rgba(0,0,0,0) 100%)' }}>
          {AGENTS.map((agent) => (
            <div
              key={`holo-${agent.id}`}
              className={`absolute inset-0 transition-all duration-700 ease-out flex items-end justify-center ${activeId === agent.id ? 'opacity-100 scale-100 blur-0' : 'opacity-0 scale-95 blur-md'}`}
            >
              <img
                src={getAssetUrl(`/about/agents/${agent.id}.png`)}
                alt={agent.name}
                className="max-w-full max-h-full object-contain object-bottom holo-agent-effect"
              />
              {activeId === agent.id && <div className="absolute inset-0 holo-scanlines mix-blend-overlay opacity-40"></div>}
            </div>
          ))}
        </div>

        {/* HUD Elements Overlay */}
        <div className="absolute inset-0 z-30 pointer-events-none">
          {/* Left HUD */}
          <div className="absolute top-[25%] sm:top-[35%] left-[4%] sm:left-[10%] text-cyan-400 font-mono text-[8px] sm:text-[10px] leading-tight opacity-70 tracking-widest drop-shadow-[0_0_4px_rgba(0,240,255,0.8)]">
            <div>CORE_INT: ACTIVE</div>
            <div>MODEL_ID: {activeAgent.id.toUpperCase()}</div>
            <div>PROJECTION: STABLE</div>
            <div className="mt-1 sm:mt-2 text-cyan-200/50">&lt;GRID_SYNC: 98%&gt;</div>
            <div className="mt-2 sm:mt-4 w-8 sm:w-12 h-px bg-cyan-500/50"></div>
          </div>

          {/* Right HUD */}
          <div className="absolute top-[35%] sm:top-[45%] right-[4%] sm:right-[10%] text-cyan-400 font-mono text-[8px] sm:text-[10px] leading-tight text-right opacity-70 tracking-widest drop-shadow-[0_0_4px_rgba(0,240,255,0.8)]">
            <div>PROJECTION: 5845</div>
            <div>NODE_STAT: {activeAgent.role.toUpperCase()}</div>
            <div className="mt-1 sm:mt-2 text-cyan-200/50">&lt;UPLINK: SECURE&gt;</div>
            <div className="mt-2 sm:mt-4 w-8 sm:w-12 h-px bg-cyan-500/50 ml-auto"></div>
          </div>

          {/* Floating UI squares */}
          <div className="absolute top-[20%] right-[25%] w-1.5 sm:w-2 h-1.5 sm:h-2 border border-cyan-400/50 animate-pulse"></div>
          <div className="absolute top-[60%] left-[20%] w-2 sm:w-3 h-2 sm:h-3 border border-cyan-400/30 animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute bottom-[35%] right-[30%] w-1 sm:w-1.5 h-1 sm:h-1.5 bg-cyan-400/50 animate-ping"></div>
        </div>
      </div>

      {/* RIGHT: SCROLLING ARCHIVE */}
      <div
        ref={scrollContainerRef}
        className="archive-scroll-wrapper w-full md:w-[50vw] h-[55vh] md:h-[100dvh] overflow-y-auto bg-[#010409]"
      >
        <div className="px-6 sm:px-12 md:px-16 lg:px-24">
          <div className="h-[20vh] md:h-[40vh]"></div>

          {AGENTS.map((agent) => (
            <div
              key={agent.id}
              data-id={agent.id}
              className="agent-scroll-section min-h-[60vh] md:min-h-screen flex flex-col justify-center py-12 md:py-16 transition-opacity duration-500"
              style={{ opacity: activeId === agent.id ? 1 : 0.3 }}
            >
              <div className="flex items-center gap-3 mb-4 md:mb-6">
                <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full shadow-[0_0_10px_currentColor]" style={{ backgroundColor: agent.color, color: agent.color }}></div>
                <div className="font-mono text-[10px] md:text-xs font-bold uppercase tracking-[0.2em]" style={{ color: agent.color }}>
                  {agent.role}
                </div>
              </div>

              <h2 className="text-3xl sm:text-4xl md:text-6xl font-black mb-4 md:mb-6 tracking-tight text-white drop-shadow-md uppercase select-text">
                {agent.name}
              </h2>

              <p className="text-base sm:text-lg md:text-xl text-slate-300/80 leading-relaxed max-w-xl mb-8 md:mb-12 select-text">
                {agent.desc}
              </p>

              <div className="max-w-xl mb-5 md:mb-7 pl-4 border-l border-cyan-400/30">
                <div className="font-mono text-[9px] md:text-[10px] text-cyan-400/55 uppercase tracking-widest mb-2">
                  Primary Directive
                </div>
                <p className="text-sm md:text-base text-cyan-100/75 leading-relaxed select-text m-0">
                  {agent.directive}
                </p>
              </div>

              <div className="relative p-5 md:p-6 rounded-lg border border-white/5 bg-white/[0.02] backdrop-blur-md max-w-xl group overflow-hidden hover:border-white/10 transition-colors">
                <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: agent.color }}></div>
                <div className="font-mono text-[9px] md:text-[10px] text-slate-500 uppercase tracking-widest mb-2 md:mb-3">
                  Behavioral Profile
                </div>
                <div className="font-mono text-xs sm:text-sm md:text-base text-cyan-100/90 leading-relaxed select-text">
                  {agent.personality}
                </div>
                {/* Decorative corner */}
                <div className="absolute bottom-0 right-0 w-3 md:w-4 h-3 md:h-4 border-b border-r border-white/10 m-2"></div>
              </div>
            </div>
          ))}

          <div className="h-[40vh] md:h-[60vh]"></div>
        </div>
      </div>
    </div>
  );
}
