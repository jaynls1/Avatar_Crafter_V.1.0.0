import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import {
  ClerkProvider,
  Show,
  SignIn,
  SignUp,
  useAuth,
  useClerk,
  useUser,
} from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import {
  Redirect,
  Route,
  Router as WouterRouter,
  Switch,
  useLocation,
} from "wouter";
import { Agent, fetchAgents, getLobbyAgents, getLobbyAgentIds } from "./agents";
import { Scene3D } from "./components/Scene3D";
import { InteractionPanel } from "./components/InteractionPanel";
import { AgentSelector } from "./components/AgentSelector";
import { WebGLFallback } from "./components/WebGLFallback";
import { Walkthrough } from "./components/Walkthrough";
import NotFound from "./pages/not-found";
import {
  NEXT_LEVEL_PORTAL_URL,
  VIRTUAL_OFFICE_URL,
} from "./lib/trustedNavigation";
import { trackEvent } from "./lib/analytics";

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in .env file");
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
    socialButtonsPlacement: "top" as const,
    socialButtonsVariant: "blockButton" as const,
  },
  variables: {
    colorPrimary: "#a78bfa",
    colorForeground: "#f8fafc",
    colorMutedForeground: "#a8a6bd",
    colorDanger: "#fb7185",
    colorBackground: "#0b0b1d",
    colorInput: "#15152c",
    colorInputForeground: "#f8fafc",
    colorNeutral: "#6c63ff",
    fontFamily: "Inter, sans-serif",
    borderRadius: "0.875rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-[#0b0b1d] rounded-2xl w-[440px] max-w-full overflow-hidden border border-violet-400/30 shadow-[0_24px_80px_rgba(76,29,149,0.32)]",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-slate-50",
    headerSubtitle: "text-slate-300",
    socialButtonsBlockButtonText: "text-slate-100",
    formFieldLabel: "text-slate-100",
    footerActionLink: "text-violet-300 font-semibold",
    footerActionText: "text-slate-300",
    dividerText: "text-slate-400",
    identityPreviewEditButton: "text-violet-300",
    formFieldSuccessText: "text-emerald-300",
    alertText: "text-rose-100",
    logoBox: "h-12",
    logoImage: "h-11 w-auto",
    socialButtonsBlockButton: "border-violet-300/30 bg-white/5 text-slate-100",
    formButtonPrimary: "bg-violet-500 text-white font-semibold",
    formFieldInput: "border-violet-300/25 bg-[#15152c] text-slate-50",
    footerAction: "bg-transparent",
    dividerLine: "bg-violet-300/20",
    alert: "border-rose-400/40 bg-rose-400/10",
    otpCodeFieldInput: "border-violet-300/30 bg-[#15152c] text-slate-50",
    formFieldRow: "text-slate-100",
    main: "gap-5",
  },
};

function detectWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    return !!gl;
  } catch {
    return false;
  }
}

function SpecialtyFilterBanner({
  specialty,
  onClear,
}: {
  specialty: string;
  onClear: () => void;
}) {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        background: "rgba(5,5,20,0.82)",
        backdropFilter: "blur(16px)",
        border: "1px solid rgba(167,139,250,0.45)",
        borderRadius: 40,
        padding: "8px 18px 8px 16px",
        color: "white",
        fontFamily: "'Inter', sans-serif",
        display: "flex",
        alignItems: "center",
        gap: 10,
        zIndex: 300,
        boxShadow: "0 4px 24px rgba(108,99,255,0.25)",
        animation: "filterBannerIn 0.25s ease",
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", letterSpacing: 0.5 }}>
        Filtering by:
      </span>
      <span style={{ fontSize: 13, fontWeight: 700, color: "#A78BFA", letterSpacing: 0.3 }}>
        {specialty}
      </span>
      <button
        onClick={onClear}
        title="Clear filter"
        aria-label="Clear specialty filter"
        style={{
          background: "rgba(167,139,250,0.18)",
          border: "1px solid rgba(167,139,250,0.35)",
          borderRadius: "50%",
          color: "#A78BFA",
          width: 22,
          height: 22,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          fontSize: 14,
          lineHeight: 1,
          padding: 0,
          flexShrink: 0,
        }}
      >
        ×
      </button>
      <style>{`
        @keyframes filterBannerIn {
          from { opacity: 0; transform: translateX(-50%) translateY(8px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}

function JourneyNavigation() {
  return (
    <nav className="next-journey-nav" aria-label="NEXT Level journey">
      <div className="next-journey-nav__heading">
        <span className="next-journey-nav__eyebrow">NEXT LEVEL JOURNEY</span>
        <span className="next-journey-nav__copy">
          Continue when you are ready.
        </span>
      </div>
      <div className="next-journey-nav__actions">
        <a
          className="next-journey-nav__link next-journey-nav__link--primary"
          href={VIRTUAL_OFFICE_URL}
          onClick={() => trackEvent("journey_navigation_clicked", { destination: "virtual_office" })}
        >
          Continue to Virtual Offices
          <span aria-hidden="true">→</span>
        </a>
        <a
          className="next-journey-nav__link next-journey-nav__link--secondary"
          href={NEXT_LEVEL_PORTAL_URL}
          onClick={() => trackEvent("journey_navigation_clicked", { destination: "portal" })}
        >
          Return to NEXT Level
        </a>
      </div>
    </nav>
  );
}

function HUD({
  agentCount,
  lobbyCount,
}: {
  agentCount: number;
  lobbyCount: number;
}) {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [, setLocation] = useLocation();
  const previousAuthState = useRef<boolean | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (previousAuthState.current === false && isSignedIn) {
      trackEvent("member_entry_succeeded");
    }
    previousAuthState.current = Boolean(isSignedIn);
  }, [isLoaded, isSignedIn]);

  return (
    <div
      style={{
        position: "fixed",
        top: 20,
        left: "50%",
        transform: "translateX(-50%)",
        background: "rgba(5,5,20,0.75)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(108,99,255,0.3)",
        borderRadius: 16,
        padding: "10px 24px",
        color: "white",
        fontFamily: "'Inter', sans-serif",
        display: "flex",
        alignItems: "center",
        gap: 16,
        zIndex: 200,
      }}
    >
      <div style={{ color: "#A78BFA", fontWeight: 700, fontSize: 15, letterSpacing: 1, pointerEvents: "none" }}>
        ◈ AGENT LOBBY
      </div>
      <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.15)" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 6, pointerEvents: "none" }}>
        <div
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "#10B981",
            boxShadow: "0 0 8px #10B981",
            animation: "hudPulse 2s ease-in-out infinite",
          }}
        />
        <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>
          {lobbyCount} in lobby · {agentCount - lobbyCount} in offices
        </span>
      </div>
      <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.15)" }} />
      <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, pointerEvents: "none" }}>
        💬 Click to chat · 🖱️ Drag to explore
      </div>
      <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.15)" }} />
      {isLoaded && (
        isSignedIn ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {user?.imageUrl && (
              <img
                src={user.imageUrl}
                alt={`${user.firstName ?? "Member"} profile`}
                data-testid="img-member-avatar"
                style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "cover" }}
              />
            )}
            <span
              data-testid="text-member-name"
              style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}
            >
              {user?.firstName ?? user?.primaryEmailAddress?.emailAddress ?? "Member"}
            </span>
            <button
              type="button"
              data-testid="button-sign-out"
              onClick={() => {
                trackEvent("sign_out_clicked");
                signOut({ redirectUrl: basePath || "/" });
              }}
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 8,
                color: "rgba(255,255,255,0.6)",
                fontSize: 11,
                padding: "3px 10px",
                cursor: "pointer",
              }}
            >
              Log out
            </button>
          </div>
        ) : (
          <button
            type="button"
            data-testid="button-sign-in"
            onClick={() => {
              trackEvent("sign_in_clicked");
              setLocation("/sign-in");
            }}
            style={{
              background: "rgba(167,139,250,0.15)",
              border: "1px solid rgba(167,139,250,0.4)",
              borderRadius: 8,
              color: "#A78BFA",
              fontSize: 12,
              fontWeight: 600,
              padding: "4px 14px",
              cursor: "pointer",
            }}
          >
            Log in
          </button>
        )
      )}
      <style>{`
        @keyframes hudPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.5; transform: scale(1.4); }
        }
      `}</style>
    </div>
  );
}

const urlParams    = new URLSearchParams(window.location.search);
const EMBED_MODE   = urlParams.get("mode") === "embed";
const EMBED_AGENT_ID = urlParams.get("agent") ?? null;

function AvatarWorld({
  canUseProtectedFeatures,
  onAccessDenied,
}: {
  canUseProtectedFeatures: boolean;
  onAccessDenied: () => void;
}) {
  const [, setLocation] = useLocation();
  const [agents, setAgents]             = useState<Agent[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);
  const [agentsError, setAgentsError]   = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [speakingAgentId, setSpeakingAgentId] = useState<string | null>(null);
  const [highlightedSpecialty, setHighlightedSpecialty] = useState<string | null>(null);
  const [webGLAvailable, setWebGLAvailable] = useState<boolean | null>(null);
  const [showWalkthrough, setShowWalkthrough] = useState(!EMBED_MODE);

  // Track current hour so the lobby roster updates when the clock rolls over
  const [currentHour, setCurrentHour] = useState(new Date().getHours());

  useEffect(() => {
    const hasWebGL = detectWebGL();
    setWebGLAvailable(hasWebGL);
    if (!hasWebGL) {
      trackEvent("webgl_unavailable", { error_kind: "unsupported" });
    }
    if (!EMBED_MODE) {
      const seen = localStorage.getItem("agentworld-tour-done");
      if (seen) setShowWalkthrough(false);
    }
    fetchAgents()
      .then((data) => { setAgents(data); setAgentsLoading(false); })
      .catch((err)  => {
        console.error("Failed to load agents:", err);
        trackEvent("agent_load_failed", { error_kind: "request_failed" });
        setAgentsError("Could not load agents. Please refresh.");
        setAgentsLoading(false);
      });

    // Update lobby roster when the hour rolls over
    const tick = setInterval(() => {
      setCurrentHour(new Date().getHours());
    }, 60_000);
    return () => clearInterval(tick);
  }, []);

  // Agents currently in the open lobby (Nova + scheduled visitors)
  const lobbyAgents = useMemo(
    () => getLobbyAgents(agents, currentHour),
    [agents, currentHour]
  );

  // Set of IDs in lobby — used by AgentSelector for "in lobby" badges
  const lobbyAgentIds = useMemo(
    () => getLobbyAgentIds(currentHour),
    [currentHour]
  );

  // Embed mode: honour ?agent= param pre-select
  const embedInitAgent = EMBED_MODE && EMBED_AGENT_ID
    ? agents.find((a) => a.id === EMBED_AGENT_ID) ?? null
    : null;

  const handleWalkthroughComplete = useCallback(() => {
    setShowWalkthrough(false);
    localStorage.setItem("agentworld-tour-done", "1");
  }, []);

  const handleSelectAgent = useCallback((agent: Agent) => {
    if (selectedAgent?.id !== agent.id) {
      trackEvent("agent_profile_opened");
    }
    setSelectedAgent(agent);
  }, [selectedAgent]);
  const handleStartSpeaking = useCallback(() => {
    if (selectedAgent) setSpeakingAgentId(selectedAgent.id);
  }, [selectedAgent]);
  const handleStopSpeaking  = useCallback(() => setSpeakingAgentId(null), []);
  const handleRequestSignIn = useCallback(() => {
    trackEvent("sign_in_clicked");
    setLocation("/sign-in");
  }, [setLocation]);
  const handleClose = useCallback(() => {
    if (selectedAgent) {
      trackEvent("agent_profile_closed");
    }
    setSelectedAgent(null);
    setSpeakingAgentId(null);
  }, [selectedAgent]);

  // ── Loading / error screens ──────────────────────────────────────────────────
  if (webGLAvailable === null || agentsLoading) {
    return (
      <div style={{ width: "100vw", height: "100vh", background: "#060c14", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 40, height: 40, border: "3px solid rgba(249,115,22,0.2)", borderTop: "3px solid #F97316", borderRadius: "50%", margin: "0 auto 16px", animation: "spin 0.8s linear infinite" }} />
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>Loading agents…</div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (agentsError) {
    return (
      <div style={{ width: "100vw", height: "100vh", background: "#060c14", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', sans-serif" }}>
        <div style={{ textAlign: "center", maxWidth: 360 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
          <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 14, marginBottom: 16 }}>{agentsError}</div>
          <button onClick={() => window.location.reload()} style={{ background: "rgba(249,115,22,0.15)", border: "1px solid rgba(249,115,22,0.4)", borderRadius: 8, color: "#F97316", fontSize: 13, fontWeight: 600, padding: "8px 20px", cursor: "pointer" }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ── WebGL fallback ───────────────────────────────────────────────────────────
  if (!webGLAvailable) {
    return (
      <div style={{ width: "100vw", height: "100vh", overflow: "hidden", background: "#010108", position: "relative" }}>
        {showWalkthrough && <Walkthrough onComplete={handleWalkthroughComplete} />}
        <HUD agentCount={agents.length} lobbyCount={lobbyAgents.length} />
        {!EMBED_MODE && !selectedAgent && !highlightedSpecialty && (
          <JourneyNavigation />
        )}
        <div style={{ paddingTop: 70, height: "100%" }}>
          <WebGLFallback agents={agents} selectedAgent={selectedAgent} onSelect={handleSelectAgent} />
        </div>
        {highlightedSpecialty && (
          <SpecialtyFilterBanner specialty={highlightedSpecialty} onClear={() => setHighlightedSpecialty(null)} />
        )}
        <InteractionPanel
          agent={selectedAgent}
          isSpeaking={speakingAgentId !== null}
          canUseProtectedFeatures={canUseProtectedFeatures}
          onAccessDenied={onAccessDenied}
          onRequestSignIn={handleRequestSignIn}
          onStartSpeaking={handleStartSpeaking}
          onStopSpeaking={handleStopSpeaking}
          onClose={handleClose}
          activeSpecialtyFilter={highlightedSpecialty}
          onSpecialtyFilter={setHighlightedSpecialty}
        />
      </div>
    );
  }

  // ── Embed mode ───────────────────────────────────────────────────────────────
  if (EMBED_MODE) {
    return (
      <div style={{ width: "100vw", height: "100vh", overflow: "hidden", background: "transparent", position: "relative" }}>
        <Scene3D
          agents={embedInitAgent ? [embedInitAgent] : lobbyAgents}
          selectedAgent={selectedAgent}
          speakingAgentId={speakingAgentId}
          specialtyFilter={highlightedSpecialty}
          onSelectAgent={handleSelectAgent}
        />
        {highlightedSpecialty && (
          <SpecialtyFilterBanner specialty={highlightedSpecialty} onClear={() => setHighlightedSpecialty(null)} />
        )}
        <InteractionPanel
          agent={selectedAgent}
          isSpeaking={speakingAgentId !== null}
          canUseProtectedFeatures={canUseProtectedFeatures}
          onAccessDenied={onAccessDenied}
          onRequestSignIn={handleRequestSignIn}
          onStartSpeaking={handleStartSpeaking}
          onStopSpeaking={handleStopSpeaking}
          onClose={handleClose}
          activeSpecialtyFilter={highlightedSpecialty}
          onSpecialtyFilter={setHighlightedSpecialty}
        />
      </div>
    );
  }

  // ── Full layout ──────────────────────────────────────────────────────────────
  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden", background: "#010108" }}>
      {showWalkthrough && <Walkthrough onComplete={handleWalkthroughComplete} />}

      <HUD agentCount={agents.length} lobbyCount={lobbyAgents.length} />
      {!selectedAgent && !highlightedSpecialty && <JourneyNavigation />}

      {/* Left sidebar — shows ALL agents for chat access; badges for lobby/office */}
      <AgentSelector
        agents={agents}
        selectedAgent={selectedAgent}
        lobbyAgentIds={lobbyAgentIds}
        activeSpecialtyFilter={highlightedSpecialty}
        onSelect={handleSelectAgent}
        onSpecialtyFilter={setHighlightedSpecialty}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          marginLeft: "210px",
          marginRight: selectedAgent ? "380px" : "0px",
          transition: "margin-right 0.3s ease",
        }}
      >
        {/* 3D scene only renders lobby agents at their lobby positions */}
        <Scene3D
          agents={lobbyAgents}
          selectedAgent={selectedAgent}
          speakingAgentId={speakingAgentId}
          specialtyFilter={highlightedSpecialty}
          onSelectAgent={handleSelectAgent}
        />
        {highlightedSpecialty && (
          <SpecialtyFilterBanner specialty={highlightedSpecialty} onClear={() => setHighlightedSpecialty(null)} />
        )}
      </div>

      <InteractionPanel
        agent={selectedAgent}
        isSpeaking={speakingAgentId !== null}
        canUseProtectedFeatures={canUseProtectedFeatures}
        onAccessDenied={onAccessDenied}
        onRequestSignIn={handleRequestSignIn}
        onStartSpeaking={handleStartSpeaking}
        onStopSpeaking={handleStopSpeaking}
        onClose={handleClose}
        activeSpecialtyFilter={highlightedSpecialty}
        onSpecialtyFilter={setHighlightedSpecialty}
      />
    </div>
  );
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/world" />
      </Show>
      <Show when="signed-out">
        <AvatarWorld canUseProtectedFeatures={false} onAccessDenied={() => {}} />
      </Show>
    </>
  );
}

function MemberWorld() {
  const { isLoaded, isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const [accessDenied, setAccessDenied] = useState(false);

  if (!isLoaded) {
    return (
      <main className="next-auth-page" data-testid="clerk-loading">
        <div className="next-auth-page__shell">
          <div className="next-auth-page__eyebrow">NEXT AGENT WORLD</div>
          <p className="next-auth-page__description">Verifying your member session…</p>
        </div>
      </main>
    );
  }

  if (!isSignedIn) {
    return <Redirect to="/" />;
  }

  if (accessDenied) {
    return (
      <main className="next-auth-page" data-testid="server-access-denied">
        <div className="next-auth-page__shell">
          <div className="next-auth-page__brand">
            <div className="next-auth-page__eyebrow">ACCESS NOT AVAILABLE</div>
            <p className="next-auth-page__description">
              Your account is signed in, but it does not currently have access to Agent World conversations.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <button
              type="button"
              onClick={() => setAccessDenied(false)}
              className="next-journey-nav__link next-journey-nav__link--primary"
            >
              Try again
            </button>
            <button
              type="button"
              data-testid="button-denied-sign-out"
              onClick={() => signOut({ redirectUrl: basePath || "/" })}
              className="next-journey-nav__link next-journey-nav__link--secondary"
            >
              Sign out and return home
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <AvatarWorld
      canUseProtectedFeatures
      onAccessDenied={() => setAccessDenied(true)}
    />
  );
}

function AuthPage({
  mode,
}: {
  mode: "sign-in" | "sign-up";
}) {
  const isSignIn = mode === "sign-in";

  return (
    <main className="next-auth-page">
      <div className="next-auth-page__shell">
        <div className="next-auth-page__brand">
          <div className="next-auth-page__eyebrow">NEXT AGENT WORLD</div>
          <p className="next-auth-page__description" data-testid={`text-${mode}-description`}>
            {isSignIn
              ? "Welcome back. Sign in to enter your shared world and continue working with your AI team."
              : "Create your member account to enter Agent World and collaborate with your AI team."}
          </p>
        </div>
        {isSignIn ? (
          <SignIn
            routing="path"
            path={`${basePath}/sign-in`}
            signUpUrl={`${basePath}/sign-up`}
          />
        ) : (
          <SignUp
            routing="path"
            path={`${basePath}/sign-up`}
            signInUrl={`${basePath}/sign-in`}
          />
        )}
      </div>
    </main>
  );
}

function SignInPage() {
  return <AuthPage mode="sign-in" />;
}

function SignUpPage() {
  return <AuthPage mode="sign-up" />;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: "Welcome back",
            subtitle: "Sign in to enter NEXT Agent World",
          },
        },
        signUp: {
          start: {
            title: "Join Agent World",
            subtitle: "Create your NEXT member account",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <Switch>
        <Route path="/" component={HomeRedirect} />
        <Route path="/world" component={MemberWorld} />
        <Route path="/sign-in/*?" component={SignInPage} />
        <Route path="/sign-up/*?" component={SignUpPage} />
        <Route component={NotFound} />
      </Switch>
    </ClerkProvider>
  );
}

export default function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}
