const O = "#F97316";
const OL = "#FB923C";
const OR = (a: number) => `rgba(249,115,22,${a})`;

const ABOUT_CONTENT = {
  vision: {
    headline: "Our Vision",
    body: `NEXT exists to help people move forward. We believe in practical tools, clear thinking, and building systems that actually work — so you can focus on what matters most.

[Edit this section to share the full NEXT vision and what you're ultimately working toward.]`,
  },
  values: [
    {
      title: "Purpose Over Noise",
      body: "Everything we build has a reason. No clutter, no filler — just tools and resources that earn their place.",
    },
    {
      title: "Built to Move",
      body: "We design for people who are in motion. NEXT is for doers, builders, and creators who don't have time to waste.",
    },
    {
      title: "Clarity First",
      body: "Clear communication. Clear systems. Clear results. We cut through complexity so you don't have to.",
    },
    {
      title: "Growth by Design",
      body: "We're intentional about what we create and how we grow — strategy over speed, substance over hype.",
    },
  ],
  team: [
    { name: "Team Member Name", role: "Strategy & Vision", bio: "Edit this with a short bio about this team member and their role at NEXT." },
    { name: "Team Member Name", role: "Operations", bio: "Edit this with a short bio about this team member and their role at NEXT." },
    { name: "Team Member Name", role: "Sales & Growth", bio: "Edit this with a short bio about this team member and their role at NEXT." },
    { name: "Team Member Name", role: "Legal & Compliance", bio: "Edit this with a short bio about this team member and their role at NEXT." },
    { name: "Team Member Name", role: "Knowledge & Research", bio: "Edit this with a short bio about this team member and their role at NEXT." },
    { name: "Team Member Name", role: "Creative & Storytelling", bio: "Edit this with a short bio about this team member and their role at NEXT." },
  ],
};

export default function AboutPage({ onBack }: { onBack: () => void }) {
  return (
    <div style={{
      width: "100vw",
      minHeight: "100vh",
      background: "#000",
      fontFamily: "'Inter', sans-serif",
      color: "white",
      overflowY: "auto",
    }}>
      {/* Header */}
      <div style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: "rgba(0,0,0,0.88)",
        backdropFilter: "blur(16px)",
        borderBottom: `1px solid ${OR(0.15)}`,
        padding: "16px 40px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: `linear-gradient(135deg, ${O}, ${OL})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 900, fontSize: 16, color: "white",
            boxShadow: `0 2px 12px ${OR(0.4)}`,
          }}>N</div>
          <span style={{ fontWeight: 700, fontSize: 15 }}>NEXT</span>
          <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 13 }}>Level Solutions</span>
          <span style={{ color: "rgba(255,255,255,0.15)", margin: "0 4px" }}>/</span>
          <span style={{ color: OR(0.8), fontSize: 13, fontWeight: 500 }}>About Us</span>
        </div>
        <button
          onClick={onBack}
          style={{
            background: "transparent",
            border: `1px solid ${OR(0.3)}`,
            color: O,
            padding: "8px 18px",
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = OR(0.12); }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        >
          ← Back
        </button>
      </div>

      {/* Hero */}
      <div style={{
        padding: "80px 40px 60px",
        maxWidth: 900,
        margin: "0 auto",
        borderBottom: `1px solid rgba(255,255,255,0.06)`,
      }}>
        <div style={{ color: OR(0.6), fontSize: 11, letterSpacing: 3, marginBottom: 16, textTransform: "uppercase" }}>
          About NEXT Level Solutions
        </div>
        <h1 style={{
          fontSize: 52,
          fontWeight: 900,
          lineHeight: 1.1,
          margin: "0 0 24px",
          letterSpacing: -1.5,
        }}>
          We're building something<br />
          <span style={{ color: O }}>that actually matters.</span>
        </h1>
        <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 17, lineHeight: 1.8, maxWidth: 620, margin: 0 }}>
          [Edit this opening paragraph to introduce NEXT — who you are, what you stand for, and why you're building this. Keep it personal and direct.]
        </p>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 40px" }}>

        {/* Vision */}
        <section style={{ padding: "64px 0", borderBottom: `1px solid rgba(255,255,255,0.06)` }}>
          <div style={{ display: "flex", gap: 60, alignItems: "flex-start" }}>
            <div style={{ flexShrink: 0, width: 180 }}>
              <div style={{ color: OR(0.5), fontSize: 10, letterSpacing: 3, textTransform: "uppercase", marginBottom: 8 }}>01</div>
              <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: "white" }}>{ABOUT_CONTENT.vision.headline}</h2>
            </div>
            <div style={{ flex: 1 }}>
              {ABOUT_CONTENT.vision.body.split("\n\n").map((para, i) => (
                <p key={i} style={{ color: "rgba(255,255,255,0.55)", fontSize: 15, lineHeight: 1.85, margin: "0 0 18px" }}>
                  {para}
                </p>
              ))}
            </div>
          </div>
        </section>

        {/* Values */}
        <section style={{ padding: "64px 0", borderBottom: `1px solid rgba(255,255,255,0.06)` }}>
          <div style={{ marginBottom: 40 }}>
            <div style={{ color: OR(0.5), fontSize: 10, letterSpacing: 3, textTransform: "uppercase", marginBottom: 8 }}>02</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Our Values</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {ABOUT_CONTENT.values.map((v, i) => (
              <div key={i} style={{
                padding: "28px 28px",
                background: "rgba(255,255,255,0.03)",
                border: `1px solid rgba(255,255,255,0.07)`,
                borderRadius: 16,
                transition: "border-color 0.2s",
              }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = OR(0.25); }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; }}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: OR(0.15), border: `1px solid ${OR(0.25)}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 800, color: O,
                  marginBottom: 16,
                }}>{i + 1}</div>
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 10px", color: "white" }}>{v.title}</h3>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.7, margin: 0 }}>{v.body}</p>
              </div>
            ))}
          </div>
          <p style={{ marginTop: 20, color: "rgba(255,255,255,0.2)", fontSize: 12 }}>
            [Edit the values above directly in <code style={{ color: OR(0.5) }}>src/pages/AboutPage.tsx</code> to match your real NEXT values]
          </p>
        </section>

        {/* Team */}
        <section style={{ padding: "64px 0 80px" }}>
          <div style={{ marginBottom: 40 }}>
            <div style={{ color: OR(0.5), fontSize: 10, letterSpacing: 3, textTransform: "uppercase", marginBottom: 8 }}>03</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 10px" }}>The Team</h2>
            <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 14, margin: 0 }}>
              [Edit each card below with real names, roles, and short bios]
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 18 }}>
            {ABOUT_CONTENT.team.map((member, i) => (
              <div key={i} style={{
                padding: "24px 22px",
                background: "rgba(255,255,255,0.02)",
                border: `1px solid rgba(255,255,255,0.07)`,
                borderRadius: 14,
                transition: "all 0.2s",
              }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = OR(0.2);
                  e.currentTarget.style.background = OR(0.04);
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
                  e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                }}
              >
                {/* Avatar placeholder */}
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: `linear-gradient(135deg, ${OR(0.2)}, ${OR(0.08)})`,
                  border: `1px solid ${OR(0.2)}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16, fontWeight: 800, color: O,
                  marginBottom: 14,
                }}>
                  {member.name === "Team Member Name" ? "?" : member.name.charAt(0)}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "white", marginBottom: 3 }}>{member.name}</div>
                <div style={{ fontSize: 11, color: O, fontWeight: 600, letterSpacing: 0.5, marginBottom: 10 }}>{member.role}</div>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.38)", lineHeight: 1.65, margin: 0 }}>{member.bio}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
