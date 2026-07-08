import { useState, useEffect, useRef } from "react";
import novaFrontImg from "./assets/Nova_Front_Full_Profile_1776316654576.png";
import novaOpeningDoor from "./assets/Nova_Opening_Door_1776316654577.jpg";
import novaHandInPocket from "./assets/Nova_Front_Handinpocket_Full_1776316654576.png";
import novaHandsUp from "./assets/Nova_Walking_Hands_Up_1776316654578.png";
import novaHandsUp1 from "./assets/Nova_Walking_Hands_Up1_1776316654578.png";
import novaWalkingDown from "./assets/Nova_Walking_Hands_Down_1776316654577.png";
import novaLeftProfile from "./assets/Nova_Left_Side_Profile_Full_1776316654577.png";
import novaRightProfile from "./assets/Nova_Right_Side_Profile_Full_1776316654577.png";
import novaRightProfile1 from "./assets/Nova_Right_Side_Profile_Full1_1776316654577.png";
import novaBackProfile from "./assets/Nova_Back_Side_Profile_Full_1776316654576.png";
import AboutPage from "./pages/AboutPage";
import RookCommandCenter from "./components/RookCommandCenter";
import BackOffice from "./pages/BackOffice";

// nextNLogo, teamPhoto, novaVideo: source files not present in this environment.
// Using null fallbacks so the app renders; swap in real assets when available.
const nextNLogo: string | null = null;
const teamPhoto: string | null = null;
const novaVideo: string | null = null;

// ── GESTURE SETS — context-aware pose sequences ────────────────────────────
// Each set is played in order (looping) while Nova speaks.
// The tone is classified from the first ~80-120 chars of her response.
const GESTURE_SETS = {
  // High-energy: building, action, exciting news
  energetic: [novaHandsUp, novaHandsUp1, novaHandsUp, novaWalkingDown, novaHandsUp1],
  // Warm, open, greetings / welcoming
  welcoming: [novaFrontImg, novaHandInPocket, novaHandsUp, novaFrontImg, novaHandInPocket],
  // Thoughtful: exploring ideas, asking questions, nuanced answers
  curious:   [novaLeftProfile, novaFrontImg, novaRightProfile, novaRightProfile1, novaLeftProfile],
  // Grounded, informational, calm delivery
  calm:      [novaWalkingDown, novaHandInPocket, novaFrontImg, novaWalkingDown, novaHandInPocket],
} as const;

type GestureSet = keyof typeof GESTURE_SETS;

// Interval (ms) between frame advances — energetic moves faster, calm slower
const GESTURE_SPEED: Record<GestureSet, number> = {
  energetic: 460,
  welcoming: 820,
  curious:   680,
  calm:      800,
};

function classifyTone(text: string): GestureSet {
  const t = text.toLowerCase();
  if (/build|create|launch|action|move|drive|grow|exciting|powerful|bold|transform|game|unstoppable|momentum/.test(t))
    return "energetic";
  if (/welcome|glad|hello|here for|meet you|thank|appreciate|good to|pleased/.test(t))
    return "welcoming";
  if (/think|consider|explore|imagine|wonder|what if|discover|option|possibility|depend|question|curious|reflect/.test(t))
    return "curious";
  return "calm";
}

type Screen = "door" | "opening" | "nova" | "lobby" | "about" | "rook" | "backoffice";

const O = "#F97316";
const OL = "#FB923C";
const OR = (a: number) => `rgba(249,115,22,${a})`;

const NOVA_GREETINGS = [
  { text: "Hey. I'm Nova.", delay: 400 },
  { text: "You found us while we're still building.", delay: 1100 },
  { text: "That means something.", delay: 1800 },
  { text: "Ask me anything about NEXT — or just say hello.", delay: 2500 },
];

const FAQ_ANSWERS: [string, string][] = [
  ["hello|hi|hey", "Hey — good to meet you. Ask me anything about NEXT, or just tell me what you're working on."],
  ["what is|what.s next", "NEXT is a brand built to help people move forward — practical tools, digital resources, and better systems."],
  ["who is|who.s it for|who for", "Builders, creators, entrepreneurs, and anyone who wants useful solutions without the noise."],
  ["when|launch", "We're in the build phase right now. Join the waitlist and you'll be first to know when we go live."],
  ["different|unique", "Everything here is built with purpose. We focus on practical value, not clutter."],
  ["product|offer|have", "Expect digital resources, practical tools, organized knowledge, and content designed to help you move smarter."],
  ["team|behind|who made", "A team with strengths in strategy, operations, sales, legal, knowledge, organization, storytelling, and innovation."],
];

function getNovaReply(input: string): string {
  const lower = input.toLowerCase();
  for (const [pattern, reply] of FAQ_ANSWERS) {
    if (new RegExp(pattern).test(lower)) return reply;
  }
  return "We're still building NEXT, but I'm here for questions. What would you like to know?";
}

function PortalDoor({ onEnter }: { onEnter: () => void }) {
  // Door geometry constants — corridor walls converge on these
  const DW = 220, DH = 364;

  return (
    <div style={{
      width: "100vw", height: "100vh",
      background: "#020100",
      position: "relative", overflow: "hidden",
      fontFamily: "'Inter', sans-serif",
    }}>

      {/* ══════════════════════════════════════
          CORRIDOR GEOMETRY
          Vanishing point = door center (~38% x, ~52% y)
          Four planes converge on the door frame
      ══════════════════════════════════════ */}

      {/* Left corridor wall */}
      <div style={{
        position: "absolute", inset: 0,
        background: `linear-gradient(to right, #000 0%, #0c0601 55%, #180b02 100%)`,
        clipPath: "polygon(0 0, 37% 19%, 37% 81%, 0 100%)",
      }} />
      {/* Left wall orange wash — light from door spilling onto wall */}
      <div style={{
        position: "absolute", inset: 0,
        background: `linear-gradient(to right, transparent 0%, ${OR(0.07)} 100%)`,
        clipPath: "polygon(0 0, 37% 19%, 37% 81%, 0 100%)",
        animation: "wallWash 2.8s ease-in-out infinite",
      }} />

      {/* Right corridor wall */}
      <div style={{
        position: "absolute", inset: 0,
        background: `linear-gradient(to left, #000 0%, #0c0601 55%, #180b02 100%)`,
        clipPath: "polygon(55% 19%, 100% 0, 100% 100%, 55% 81%)",
      }} />
      {/* Right wall orange wash */}
      <div style={{
        position: "absolute", inset: 0,
        background: `linear-gradient(to left, transparent 0%, ${OR(0.07)} 100%)`,
        clipPath: "polygon(55% 19%, 100% 0, 100% 100%, 55% 81%)",
        animation: "wallWash 2.8s ease-in-out infinite",
      }} />

      {/* Ceiling — dark plane above the arch */}
      <div style={{
        position: "absolute", inset: 0,
        background: `linear-gradient(to bottom, #000 0%, #0e0601 70%, #1a0a02 100%)`,
        clipPath: "polygon(0 0, 100% 0, 55% 19%, 37% 19%)",
      }} />

      {/* Floor — perspective plane below the door threshold */}
      <div style={{
        position: "absolute", inset: 0,
        background: `linear-gradient(to top, #000 0%, #0e0601 50%, #160800 100%)`,
        clipPath: "polygon(37% 81%, 55% 81%, 100% 100%, 0 100%)",
      }} />

      {/* Corridor perspective guide lines (subtle) */}
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 1 }}>
        {/* Lines from corners to door frame */}
        <line x1="0%" y1="0%" x2="37%" y2="19%" stroke={OR(0.06)} strokeWidth="1" />
        <line x1="0%" y1="100%" x2="37%" y2="81%" stroke={OR(0.06)} strokeWidth="1" />
        <line x1="100%" y1="0%" x2="55%" y2="19%" stroke={OR(0.06)} strokeWidth="1" />
        <line x1="100%" y1="100%" x2="55%" y2="81%" stroke={OR(0.06)} strokeWidth="1" />
        {/* Intermediate guide lines for depth */}
        <line x1="0%" y1="0%" x2="37%" y2="19%" stroke={OR(0.04)} strokeWidth="0.5" strokeDasharray="4 8" />
        <line x1="18%" y1="0%" x2="37%" y2="19%" stroke={OR(0.04)} strokeWidth="0.5" />
        <line x1="18%" y1="100%" x2="37%" y2="81%" stroke={OR(0.04)} strokeWidth="0.5" />
        <line x1="82%" y1="0%" x2="55%" y2="19%" stroke={OR(0.04)} strokeWidth="0.5" />
        <line x1="82%" y1="100%" x2="55%" y2="81%" stroke={OR(0.04)} strokeWidth="0.5" />
      </svg>

      {/* ══════════════════════════════════════
          DOOR GLOW — light seeping through
      ══════════════════════════════════════ */}

      {/* Deep background halo behind the door — enormous, diffuse */}
      <div style={{
        position: "absolute",
        left: "46%", top: "50%",
        transform: "translate(-50%, -50%)",
        width: 700, height: 600,
        background: `radial-gradient(ellipse at 50% 45%, ${OR(0.28)} 0%, ${OR(0.12)} 25%, transparent 65%)`,
        filter: "blur(48px)",
        animation: "glowBreathe 2.4s ease-in-out infinite",
        zIndex: 2,
        pointerEvents: "none",
      }} />

      {/* Mid halo — tighter, warmer */}
      <div style={{
        position: "absolute",
        left: "46%", top: "50%",
        transform: "translate(-50%, -50%)",
        width: 340, height: 480,
        background: `radial-gradient(ellipse at 50% 40%, rgba(255,180,60,0.22) 0%, ${OR(0.18)} 30%, transparent 70%)`,
        filter: "blur(28px)",
        animation: "glowBreathe 2.4s ease-in-out 0.3s infinite",
        zIndex: 2,
        pointerEvents: "none",
      }} />

      {/* ══════════════════════════════════════
          LIGHT SEEPING THROUGH CRACKS
      ══════════════════════════════════════ */}

      {/* Under-door crack — sharp bright line + wide floor pool */}
      <div style={{
        position: "absolute",
        left: "37%", width: "18%",
        top: "calc(81% - 2px)",
        height: 3,
        background: `linear-gradient(to right, transparent, rgba(255,200,80,0.9) 20%, #fff 50%, rgba(255,200,80,0.9) 80%, transparent)`,
        filter: "blur(0.5px)",
        animation: "crackPulse 2.4s ease-in-out infinite",
        zIndex: 6,
      }} />
      {/* Floor light pool spreading from under-door */}
      <div style={{
        position: "absolute",
        left: "37%", width: "18%",
        top: "81%",
        height: "19%",
        background: `linear-gradient(to bottom, ${OR(0.5)} 0%, ${OR(0.18)} 30%, transparent 80%)`,
        filter: "blur(18px)",
        animation: "crackPulse 2.4s ease-in-out infinite",
        zIndex: 5,
        clipPath: "polygon(10% 0, 90% 0, 100% 100%, 0 100%)",
      }} />

      {/* Left door-edge seep — thin vertical glow */}
      <div style={{
        position: "absolute",
        left: "calc(37% - 1px)", width: 3,
        top: "19%", height: "62%",
        background: `linear-gradient(to bottom, transparent 0%, rgba(255,180,60,0.8) 20%, rgba(255,220,100,0.95) 50%, rgba(255,180,60,0.8) 80%, transparent 100%)`,
        filter: "blur(1px)",
        animation: "crackPulse 2.4s ease-in-out 0.2s infinite",
        zIndex: 6,
      }} />
      <div style={{
        position: "absolute",
        left: "37%", width: 20,
        top: "19%", height: "62%",
        background: `linear-gradient(to right, ${OR(0.45)} 0%, transparent 100%)`,
        filter: "blur(8px)",
        animation: "crackPulse 2.4s ease-in-out 0.2s infinite",
        zIndex: 5,
      }} />

      {/* Right door-edge seep */}
      <div style={{
        position: "absolute",
        left: "calc(55% - 2px)", width: 3,
        top: "19%", height: "62%",
        background: `linear-gradient(to bottom, transparent 0%, rgba(255,180,60,0.8) 20%, rgba(255,220,100,0.95) 50%, rgba(255,180,60,0.8) 80%, transparent 100%)`,
        filter: "blur(1px)",
        animation: "crackPulse 2.4s ease-in-out 0.4s infinite",
        zIndex: 6,
      }} />
      <div style={{
        position: "absolute",
        right: "45%", width: 20,
        top: "19%", height: "62%",
        background: `linear-gradient(to left, ${OR(0.45)} 0%, transparent 100%)`,
        filter: "blur(8px)",
        animation: "crackPulse 2.4s ease-in-out 0.4s infinite",
        zIndex: 5,
      }} />

      {/* Arch top seep — glow bursting over the top of the arch */}
      <div style={{
        position: "absolute",
        left: "37%", width: "18%",
        top: "calc(19% - 2px)",
        height: 3,
        background: `linear-gradient(to right, transparent, rgba(255,200,80,0.85) 25%, rgba(255,230,120,0.95) 50%, rgba(255,200,80,0.85) 75%, transparent)`,
        filter: "blur(0.5px)",
        animation: "crackPulse 2.4s ease-in-out 0.1s infinite",
        zIndex: 6,
      }} />
      {/* Arch ceiling wash */}
      <div style={{
        position: "absolute",
        left: "37%", width: "18%",
        bottom: "calc(19% + 1px)",
        top: "0",
        background: `linear-gradient(to top, ${OR(0.35)} 0%, ${OR(0.08)} 25%, transparent 55%)`,
        filter: "blur(20px)",
        animation: "crackPulse 2.4s ease-in-out 0.1s infinite",
        zIndex: 5,
        clipPath: "polygon(0 100%, 100% 100%, 110% 0, -10% 0)",
      }} />

      {/* ══════════════════════════════════════
          THE DOOR ITSELF
      ══════════════════════════════════════ */}
      <div style={{
        position: "absolute",
        left: "37%", top: "19%",
        width: "18%", height: "62%",
        zIndex: 7,
      }}>
        {/* Clickable door surface */}
        <div
          onClick={onEnter}
          className="portal-door"
          style={{
            width: "100%", height: "100%",
            borderRadius: `${DW / 2}px ${DW / 2}px 8px 8px`,
            background: `radial-gradient(ellipse at 50% 25%, ${OR(0.22)} 0%, #060402 55%, #020100 100%)`,
            border: `2px solid ${OR(0.5)}`,
            boxShadow: `0 0 0 1px ${OR(0.15)}, 0 0 30px ${OR(0.2)}, inset 0 0 40px ${OR(0.08)}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            position: "relative",
            overflow: "hidden",
            transition: "border-color 0.3s, box-shadow 0.3s",
          }}
        >
          {/* Door panel inset lines */}
          <div style={{
            position: "absolute", inset: 16,
            borderRadius: `${DW / 2 - 16}px ${DW / 2 - 16}px 4px 4px`,
            border: `1px solid ${OR(0.12)}`,
          }} />

          {/* Vertical center split line */}
          <div style={{
            position: "absolute", top: "8%", bottom: "8%", left: "50%",
            width: 1,
            background: `linear-gradient(to bottom, transparent, ${OR(0.25)} 30%, ${OR(0.25)} 70%, transparent)`,
          }} />

          {/* Interior glow pool */}
          <div style={{
            position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)",
            width: "80%", height: "60%",
            background: `radial-gradient(ellipse at 50% 80%, ${OR(0.2)} 0%, transparent 70%)`,
            filter: "blur(8px)",
            animation: "glowBreathe 2.4s ease-in-out 0.6s infinite",
          }} />

          {/* Door knob */}
          <div className="door-knob" style={{
            position: "absolute", right: "16%", top: "54%",
            width: 10, height: 10, borderRadius: "50%",
            background: `radial-gradient(circle, #fff 0%, ${O} 60%)`,
            boxShadow: `0 0 8px ${O}`,
            transition: "all 0.3s",
            animation: "knobGlow 2.4s ease-in-out infinite",
          }} />
          {/* Knob plate */}
          <div style={{
            position: "absolute", right: "calc(16% - 3px)", top: "calc(54% + 4px)",
            width: 16, height: 22, borderRadius: 3,
            border: `1px solid ${OR(0.3)}`,
            background: OR(0.06),
          }} />

          {/* Big N brand mark */}
          <span className="door-n" style={{
            fontSize: 76,
            fontWeight: 900,
            color: OR(0.45),
            letterSpacing: -4,
            lineHeight: 1,
            zIndex: 1,
            transition: "color 0.3s, text-shadow 0.3s",
            fontFamily: "'Inter', sans-serif",
            userSelect: "none",
            animation: "nGlow 2.4s ease-in-out infinite",
          }}>N</span>
        </div>
      </div>

      {/* ══════════════════════════════════════
          HEADER
      ══════════════════════════════════════ */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        padding: "18px 40px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: `1px solid ${OR(0.1)}`,
        background: "rgba(0,0,0,0.5)", backdropFilter: "blur(16px)",
        zIndex: 20,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: `linear-gradient(135deg, ${O}, ${OL})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 900, fontSize: 16, color: "white",
            boxShadow: `0 2px 12px ${OR(0.4)}`,
          }}>N</div>
          <span style={{ color: "white", fontWeight: 700, fontSize: 15 }}>NEXT</span>
          <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 13 }}>Level Solutions</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{
            display: "inline-block", width: 7, height: 7, borderRadius: "50%",
            background: O, boxShadow: `0 0 8px ${O}`,
            animation: "blink 1.8s ease-in-out infinite",
          }} />
          <span style={{ color: O, fontSize: 11, fontWeight: 600, letterSpacing: 1.5 }}>NOVA ONLINE</span>
        </div>
      </div>

      {/* ══════════════════════════════════════
          "PORTAL ENTRANCE" — centered above the arch
      ══════════════════════════════════════ */}
      <div style={{
        position: "absolute",
        left: "46%", top: "11%",
        transform: "translateX(-50%)",
        zIndex: 20, textAlign: "center",
      }}>
        <span style={{
          color: OR(0.5), fontSize: 10, letterSpacing: 5,
          textTransform: "uppercase",
          textShadow: `0 0 18px ${OR(0.55)}`,
          display: "block",
          animation: "crackPulse 2.4s ease-in-out infinite",
        }}>Portal Entrance</span>
      </div>

      {/* ══════════════════════════════════════
          LEFT WALL — Headline + CTA
          Pushed closer to door via paddingLeft
      ══════════════════════════════════════ */}
      <div style={{
        position: "absolute",
        left: 0, top: "28%",
        width: "44%",
        zIndex: 20,
        perspective: "850px",
        perspectiveOrigin: "100% 50%",
        paddingLeft: "7%",
        boxSizing: "border-box",
      }}>
        <div style={{
          transform: "rotateY(28deg)",
          transformOrigin: "left center",
        }}>
          <div style={{ lineHeight: 1, marginBottom: 4 }}>
            <span style={{
              display: "block",
              fontSize: 48, fontWeight: 900,
              color: "rgba(255,255,255,0.45)",
              letterSpacing: -1,
              textShadow: `2px 0 24px ${OR(0.12)}`,
              animation: "wallFlicker 7s ease-in-out 0.3s infinite",
            }}>Something is</span>
          </div>
          <div style={{ lineHeight: 1, marginBottom: 4 }}>
            <span style={{
              display: "block",
              fontSize: 58, fontWeight: 900,
              color: OR(0.9),
              letterSpacing: -2,
              textShadow: `2px 0 36px ${OR(0.8)}, 4px 0 70px ${OR(0.45)}`,
              animation: "wallFlickerOrange 5.5s ease-in-out 1.1s infinite",
            }}>being built</span>
          </div>
          <div style={{ lineHeight: 1 }}>
            <span style={{
              display: "block",
              fontSize: 70, fontWeight: 900,
              color: "rgba(255,255,255,0.9)",
              letterSpacing: -2,
              textShadow: `2px 0 28px ${OR(0.18)}`,
              animation: "wallFlicker 9s ease-in-out 0s infinite",
            }}>here.</span>
          </div>
        </div>

        {/* CTA — flat below the headline */}
        <div style={{ paddingLeft: "4%", marginTop: 34 }}>
          <button
            onClick={onEnter}
            className="enter-btn"
            style={{
              padding: "13px 30px",
              borderRadius: 12,
              background: `linear-gradient(135deg, ${O}, ${OL})`,
              border: "none", color: "white",
              fontSize: 14, fontWeight: 700,
              cursor: "pointer",
              boxShadow: `0 4px 22px ${OR(0.45)}`,
              display: "flex", alignItems: "center", gap: 8,
              transition: "transform 0.15s, box-shadow 0.15s",
            }}
          >
            Enter NEXT <span style={{ fontSize: 15 }}>→</span>
          </button>
          <div style={{ marginTop: 10, color: "rgba(255,255,255,0.5)", fontSize: 12, letterSpacing: 0.5 }}>
            Nova is ready to answer your questions
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════
          RIGHT WALL — Gallery of framed word-art
          Values the company stands on, like hallway paintings
      ══════════════════════════════════════ */}
      <div style={{
        position: "absolute",
        right: 0, top: "14%",
        width: "40%",
        zIndex: 20,
        perspective: "850px",
        perspectiveOrigin: "0% 50%",
        paddingRight: "7%",
        boxSizing: "border-box",
      }}>
        <div style={{
          transform: "rotateY(-28deg)",
          transformOrigin: "right center",
        }}>
          {/* Row 1 — top two frames */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            {[
              { word: "CLARITY",      num: "01" },
              { word: "TRANSPARENCY", num: "02" },
            ].map(({ word, num }, i) => (
              <div key={i} style={{
                border: `1px solid ${OR(0.35)}`,
                boxShadow: `0 0 16px ${OR(0.08)}, inset 0 0 20px rgba(0,0,0,0.6)`,
                background: "rgba(8,4,1,0.85)",
                borderRadius: 3,
                padding: "10px",
                animation: `wallFlicker ${7 + i * 1.3}s ease-in-out ${i * 0.7}s infinite`,
              }}>
                <div style={{
                  border: `1px solid ${OR(0.18)}`,
                  padding: "14px 10px 10px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  minHeight: 64,
                }}>
                  <span style={{
                    fontSize: word.length > 8 ? 12 : 18,
                    fontWeight: 900,
                    color: "rgba(255,255,255,0.88)",
                    letterSpacing: word.length > 8 ? 0.5 : 2.5,
                    textAlign: "center",
                    textShadow: `0 0 20px ${OR(0.15)}`,
                  }}>{word}</span>
                </div>
                <div style={{ marginTop: 6, fontSize: 8, letterSpacing: 1.5, color: OR(0.4), textAlign: "center", fontFamily: "monospace" }}>No. {num}</div>
              </div>
            ))}
          </div>

          {/* Row 2 — middle two frames */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            {[
              { word: "LOVE PEOPLE", num: "03" },
              { word: "USE MONEY",   num: "04" },
            ].map(({ word, num }, i) => (
              <div key={i} style={{
                border: `1px solid ${OR(i === 0 ? 0.4 : 0.35)}`,
                boxShadow: `0 0 ${i === 0 ? 22 : 16}px ${OR(i === 0 ? 0.12 : 0.08)}, inset 0 0 20px rgba(0,0,0,0.6)`,
                background: "rgba(8,4,1,0.85)",
                borderRadius: 3,
                padding: "10px",
                animation: `wallFlicker${i === 0 ? "Orange" : ""} ${8 + i * 1.1}s ease-in-out ${1.5 + i * 0.6}s infinite`,
              }}>
                <div style={{
                  border: `1px solid ${OR(i === 0 ? 0.28 : 0.18)}`,
                  padding: "14px 10px 10px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  minHeight: 64,
                }}>
                  <span style={{
                    fontSize: 14,
                    fontWeight: 900,
                    color: i === 0 ? OR(0.95) : "rgba(255,255,255,0.88)",
                    letterSpacing: 1.5,
                    textAlign: "center",
                    textShadow: i === 0 ? `0 0 28px ${OR(0.5)}` : `0 0 18px ${OR(0.15)}`,
                  }}>{word}</span>
                </div>
                <div style={{ marginTop: 6, fontSize: 8, letterSpacing: 1.5, color: OR(0.4), textAlign: "center", fontFamily: "monospace" }}>No. {num}</div>
              </div>
            ))}
          </div>

          {/* Row 3 — wide bottom frame */}
          <div style={{
            border: `1px solid ${OR(0.3)}`,
            boxShadow: `0 0 16px ${OR(0.08)}, inset 0 0 20px rgba(0,0,0,0.6)`,
            background: "rgba(8,4,1,0.85)",
            borderRadius: 3,
            padding: "10px",
            animation: "wallFlicker 9.5s ease-in-out 2.2s infinite",
          }}>
            <div style={{
              border: `1px solid ${OR(0.18)}`,
              padding: "14px 16px 10px",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{
                fontSize: 13, fontWeight: 900,
                color: "rgba(255,255,255,0.7)",
                letterSpacing: 2,
                textAlign: "center",
                textShadow: `0 0 20px ${OR(0.2)}`,
              }}>WHERE HEART MEETS AUTOMATION</span>
            </div>
            <div style={{ marginTop: 6, fontSize: 8, letterSpacing: 1.5, color: OR(0.35), textAlign: "center", fontFamily: "monospace" }}>No. 05 · THE PRINCIPLE</div>
          </div>
        </div>
      </div>

      {/* Bottom console */}
      <div style={{
        position: "absolute", bottom: 22, left: "50%", transform: "translateX(-50%)",
        color: OR(0.65), fontSize: 10, letterSpacing: 2.5, fontFamily: "monospace", whiteSpace: "nowrap",
        zIndex: 20,
      }}>
        &gt; NEXT SYSTEMS ONLINE · NOVA STANDING BY
      </div>

      <style>{`
        @keyframes glowBreathe {
          0%,100% { opacity: 0.7; transform: translate(-50%,-50%) scale(1); }
          50%      { opacity: 1;   transform: translate(-50%,-50%) scale(1.06); }
        }
        @keyframes crackPulse {
          0%,100% { opacity: 0.7; }
          50%      { opacity: 1; }
        }
        @keyframes wallWash {
          0%,100% { opacity: 0.6; }
          50%      { opacity: 1; }
        }
        @keyframes knobGlow {
          0%,100% { box-shadow: 0 0 8px ${O}; }
          50%      { box-shadow: 0 0 20px ${O}, 0 0 6px #fff; }
        }
        @keyframes nGlow {
          0%,100% { color: ${OR(0.45)}; text-shadow: none; }
          50%      { color: ${OR(0.7)}; text-shadow: 0 0 30px ${OR(0.5)}; }
        }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes wallFlicker {
          0%,88%,100% { opacity: 1; }
          89%  { opacity: 0.45; }
          90%  { opacity: 1; }
          93%  { opacity: 1; }
          94%  { opacity: 0.3; }
          95%  { opacity: 0.85; }
          96%  { opacity: 0.55; }
          97%  { opacity: 1; }
        }
        @keyframes wallFlickerOrange {
          0%,82%,100% { opacity: 1; }
          83%  { opacity: 0.5; }
          84%  { opacity: 1; }
          85%  { opacity: 0.7; }
          86%  { opacity: 1; }
          92%  { opacity: 1; }
          93%  { opacity: 0.25; }
          94%  { opacity: 0.9; }
          95%  { opacity: 0.6; }
          96%  { opacity: 1; }
        }
        .portal-door:hover {
          border-color: ${OR(0.85)} !important;
          box-shadow: 0 0 0 1px ${OR(0.25)}, 0 0 60px ${OR(0.4)}, inset 0 0 50px ${OR(0.15)} !important;
        }
        .portal-door:hover .door-knob { box-shadow: 0 0 28px ${O}, 0 0 8px #fff !important; }
        .portal-door:hover .door-n { color: ${OL} !important; text-shadow: 0 0 50px ${OR(0.9)} !important; }
        .enter-btn:hover { transform: scale(1.03) !important; box-shadow: 0 6px 32px ${OR(0.6)} !important; }
        .enter-btn:active { transform: scale(0.97) !important; }
      `}</style>
    </div>
  );
}

function OpeningAnimation({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<"zoom" | "reveal" | "hold">("zoom");

  useEffect(() => {
    // Door zooms → flash → Nova appears → hold → fade out
    const t1 = setTimeout(() => setPhase("reveal"), 900);
    const t2 = setTimeout(() => setPhase("hold"), 3200);
    const t3 = setTimeout(onComplete, 5800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onComplete]);

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "#000",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 999,
      animation: "bgFade 5.8s ease forwards",
    }}>

      {/* Warm interior light radiating from the open doorway */}
      <div style={{
        position: "absolute",
        width: 320, height: 480,
        borderRadius: "160px 160px 20px 20px",
        background: phase !== "zoom"
          ? `radial-gradient(ellipse at 50% 35%, rgba(255,200,120,0.55) 0%, rgba(249,115,22,0.3) 40%, transparent 72%)`
          : "transparent",
        filter: "blur(36px)",
        transition: "background 0.45s ease",
        zIndex: 1,
      }} />

      {/* The arch door frame */}
      <div style={{
        width: 240, height: 380,
        borderRadius: "120px 120px 14px 14px",
        border: `2px solid ${phase === "zoom" ? O : OR(0.5)}`,
        boxShadow: phase === "zoom"
          ? `0 0 120px ${OR(0.95)}, 0 0 260px ${OR(0.5)}`
          : `0 0 60px ${OR(0.4)}, 0 0 120px ${OR(0.2)}`,
        position: "relative",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        overflow: "visible",
        transition: "border-color 0.4s, box-shadow 0.4s",
        zIndex: 2,
        animation: phase === "zoom" ? "doorBurst 0.7s cubic-bezier(0.4,0,0.2,1) forwards" : undefined,
      }}>

        {/* Interior warm fill */}
        <div style={{
          position: "absolute", inset: 0,
          borderRadius: "118px 118px 12px 12px",
          background: `radial-gradient(ellipse at 50% 55%, rgba(255,175,90,0.18) 0%, transparent 70%)`,
          opacity: phase !== "zoom" ? 1 : 0,
          transition: "opacity 0.5s ease",
        }} />

        {/* N fades out as door opens */}
        <span style={{
          fontSize: 80, fontWeight: 900,
          color: OR(0.7),
          letterSpacing: -4, lineHeight: 1,
          position: "absolute",
          opacity: phase === "zoom" ? 1 : 0,
          transition: "opacity 0.3s ease",
          fontFamily: "'Inter', sans-serif",
          zIndex: 3,
        }}>N</span>
      </div>

      {/* Nova — slides up from bottom of the arch as the door opens */}
      <img
        src={novaOpeningDoor}
        alt="Nova"
        style={{
          position: "absolute",
          bottom: "calc(50% - 190px)",
          left: "50%",
          height: "58vh",
          maxHeight: 440,
          objectFit: "contain",
          objectPosition: "bottom center",
          zIndex: 5,
          opacity: phase !== "zoom" ? 1 : 0,
          filter: `drop-shadow(0 0 32px ${OR(0.35)}) drop-shadow(0 -8px 60px rgba(255,200,120,0.25))`,
          transition: "opacity 0.5s ease, transform 0.5s ease",
          transform: phase !== "zoom" ? "translateX(-52%) translateY(0)" : "translateX(-52%) translateY(30px)",
          pointerEvents: "none",
        }}
      />

      {/* Floor glow beneath Nova */}
      <div style={{
        position: "absolute",
        bottom: "calc(50% - 205px)",
        left: "50%",
        transform: "translateX(-50%)",
        width: 260, height: 40,
        background: `radial-gradient(ellipse at 50% 50%, ${OR(0.35)} 0%, transparent 70%)`,
        filter: "blur(12px)",
        opacity: phase !== "zoom" ? 1 : 0,
        transition: "opacity 0.6s ease 0.2s",
        zIndex: 4,
      }} />

      {/* Nova's welcome — fades in on the LEFT, clear of Nova */}
      <div style={{
        position: "absolute",
        left: "6%",
        top: "50%",
        transform: "translateY(-50%)",
        zIndex: 6,
        textAlign: "left",
        pointerEvents: "none",
      }}>
        {/* Line 1 */}
        <div style={{
          opacity: phase !== "zoom" ? 1 : 0,
          transform: phase !== "zoom" ? "translateY(0)" : "translateY(16px)",
          transition: "opacity 0.7s ease 0.3s, transform 0.7s ease 0.3s",
        }}>
          <span style={{
            display: "block",
            fontSize: 38, fontWeight: 900,
            color: "rgba(255,255,255,0.92)",
            letterSpacing: -1,
            textShadow: `0 0 40px rgba(255,200,120,0.3), 0 2px 20px rgba(0,0,0,0.8)`,
          }}>Welcome home.</span>
        </div>
        {/* Line 2 — delayed slightly more */}
        <div style={{
          opacity: phase === "hold" ? 1 : 0,
          transform: phase === "hold" ? "translateY(0)" : "translateY(14px)",
          transition: "opacity 0.8s ease 0.2s, transform 0.8s ease 0.2s",
        }}>
          <span style={{
            display: "block",
            fontSize: 22, fontWeight: 400,
            color: OR(0.9),
            letterSpacing: 0.5,
            marginTop: 8,
            textShadow: `0 0 30px ${OR(0.4)}, 0 2px 16px rgba(0,0,0,0.8)`,
          }}>We're glad you're here.</span>
        </div>
      </div>

      <style>{`
        @keyframes doorBurst {
          0%   { transform: scale(1); }
          55%  { transform: scale(1.18); }
          100% { transform: scale(1.1); }
        }
        @keyframes bgFade {
          0%   { opacity: 0; }
          8%   { opacity: 1; }
          82%  { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}

function NovaGreeting({ onEnterLobby }: { onEnterLobby: () => void }) {
  const [lines, setLines] = useState<boolean[]>([false, false, false, false]);
  const [messages, setMessages] = useState<Array<{ from: "nova" | "user"; text: string; streaming?: boolean }>>([]);
  const [input, setInput] = useState("");
  const [isTalking, setIsTalking] = useState(false);
  const [poseIdx, setPoseIdx] = useState(0);
  const [gestureSet, setGestureSet] = useState<GestureSet>("calm");
  const [convId, setConvId] = useState<number | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported] = useState(() => !!(window.SpeechRecognition || (window as any).webkitSpeechRecognition));
  const recognitionRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const startVoice = () => {
    const SR = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const rec = new SR();
    recognitionRef.current = rec;
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = false;
    rec.onstart = () => setIsListening(true);
    rec.onresult = (e: any) => {
      const transcript = Array.from(e.results as any[])
        .map((r: any) => r[0].transcript)
        .join("");
      setInput(transcript);
    };
    rec.onend = () => {
      setIsListening(false);
      setInput((prev) => {
        if (prev.trim()) {
          setTimeout(() => {
            const btn = document.getElementById("nova-send-btn");
            btn?.click();
          }, 80);
        }
        return prev;
      });
    };
    rec.onerror = () => setIsListening(false);
    rec.start();
  };

  // Greeting line cascade
  useEffect(() => {
    const timers = NOVA_GREETINGS.map((g, i) =>
      setTimeout(() => setLines((prev) => { const n = [...prev]; n[i] = true; return n; }), g.delay)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  // Create a real Nova conversation on mount
  useEffect(() => {
    fetch("/api/openai/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Chat with Nova", agentId: "nova" }),
    })
      .then((r) => r.json())
      .then((conv) => setConvId(conv.id))
      .catch(() => {});
  }, []);

  // Pose animation loop — speed + frame set driven by classified tone
  useEffect(() => {
    if (!isTalking) return;
    setPoseIdx(0);
    const frames = GESTURE_SETS[gestureSet];
    const id = setInterval(() => setPoseIdx((p) => (p + 1) % frames.length), GESTURE_SPEED[gestureSet]);
    return () => clearInterval(id);
  }, [isTalking, gestureSet]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || !convId) return;
    setInput("");
    setMessages((p) => [...p, { from: "user", text }]);
    setMessages((p) => [...p, { from: "nova", text: "", streaming: true }]);
    setIsTalking(true);
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const resp = await fetch(`/api/openai/conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
        signal: ctrl.signal,
      });

      const reader = resp.body!.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let full = "";          // accumulated response for tone classification
      let classified = false; // only classify once per response

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split("\n");
        buf = parts.pop() ?? "";
        for (const line of parts) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.done) {
              setMessages((p) => p.map((m, i) => i === p.length - 1 ? { ...m, streaming: false } : m));
              setIsTalking(false);
            } else if (data.content) {
              full += data.content;
              setMessages((p) => p.map((m, i) => i === p.length - 1 ? { ...m, text: m.text + data.content } : m));
              // Classify tone once we have enough context (~80 chars)
              if (!classified && full.length >= 80) {
                classified = true;
                setGestureSet(classifyTone(full));
              }
            }
          } catch { /* ignore parse errors */ }
        }
      }
    } catch {
      setIsTalking(false);
      setMessages((p) => p.map((m, i) => i === p.length - 1
        ? { ...m, text: "Something interrupted — try again.", streaming: false }
        : m));
    }
  };

  return (
    <div style={{
      width: "100vw",
      height: "100vh",
      background: `radial-gradient(ellipse at 28% 60%, #2a1200 0%, #0e0600 50%, #050200 100%)`,
      display: "flex",
      overflow: "hidden",
      fontFamily: "'Inter', sans-serif",
    }}>
      {/* Header */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, padding: "18px 36px",
        display: "flex", alignItems: "center", gap: 10,
        borderBottom: `1px solid ${OR(0.1)}`,
        background: "rgba(0,0,0,0.35)", backdropFilter: "blur(12px)",
        zIndex: 10,
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: 7,
          background: `linear-gradient(135deg, ${O}, ${OL})`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: 900, fontSize: 13, color: "white",
          boxShadow: `0 2px 10px ${OR(0.4)}`,
        }}>N</div>
        <span style={{ color: "white", fontWeight: 700, fontSize: 14 }}>NEXT</span>
        <span style={{ color: "rgba(255,255,255,0.22)", fontSize: 13 }}>Level Solutions</span>
      </div>

      {/* Nova character panel */}
      <div style={{
        width: "42%", position: "relative",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        flexShrink: 0, paddingTop: 60, overflow: "hidden",
      }}>
        {/* Ground glow */}
        <div style={{
          position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)",
          width: 320, height: 420,
          background: `radial-gradient(ellipse at 50% 90%, ${OR(0.25)} 0%, transparent 65%)`,
          pointerEvents: "none", zIndex: 3,
        }} />

        {/* FULL BODY IMAGE — base idle layer */}
        <img
          src={novaFrontImg}
          alt="Nova"
          style={{
            height: "88vh",
            objectFit: "contain",
            objectPosition: "bottom center",
            position: "absolute",
            bottom: 0,
            zIndex: 1,
            filter: `drop-shadow(0 0 40px ${OR(0.22)})`,
            animation: "novaIn 0.9s cubic-bezier(0.16,1,0.3,1) forwards",
            opacity: isTalking ? 0 : 1,
            transition: "opacity 0.5s ease",
          }}
        />

        {/* POSE FRAMES — only visible during talking; video handles idle */}
        {isTalking && GESTURE_SETS[gestureSet].map((src, i) => (
          <img
            key={i}
            src={src}
            alt=""
            style={{
              height: "88vh",
              objectFit: "contain",
              objectPosition: "bottom center",
              position: "absolute",
              bottom: 0,
              zIndex: 2,
              filter: `drop-shadow(0 0 48px ${OR(0.4)})`,
              opacity: i === poseIdx % GESTURE_SETS[gestureSet].length ? 1 : 0,
              transition: "opacity 0.35s ease",
            }}
          />
        ))}

        {/* Talking glow pulse */}
        {isTalking && (
          <div style={{
            position: "absolute", top: "15%", left: "50%", transform: "translateX(-50%)",
            width: 180, height: 180,
            background: `radial-gradient(circle, ${OR(0.18)} 0%, transparent 70%)`,
            filter: "blur(24px)",
            zIndex: 4,
            animation: "talkPulse 0.7s ease-in-out infinite alternate",
            pointerEvents: "none",
          }} />
        )}

        {/* Status badge */}
        <div style={{
          position: "absolute", top: 80, left: 36, zIndex: 10,
          background: "rgba(0,0,0,0.85)",
          backdropFilter: "blur(14px)",
          border: `1px solid ${isTalking ? OR(0.6) : OR(0.3)}`,
          borderRadius: 12, padding: "7px 14px",
          display: "flex", alignItems: "center", gap: 7,
          transition: "border-color 0.3s",
        }}>
          <span style={{
            display: "inline-block", width: 6, height: 6, borderRadius: "50%",
            background: O, boxShadow: `0 0 ${isTalking ? "14px" : "8px"} ${O}`,
            animation: isTalking ? "talkDot 0.5s ease-in-out infinite alternate" : "blink2 1.6s ease-in-out infinite",
            transition: "box-shadow 0.3s",
          }} />
          <span style={{ color: O, fontSize: 11, fontWeight: 600, letterSpacing: 1 }}>
            {isTalking ? "NOVA SPEAKING" : "NOVA ONLINE"}
          </span>
        </div>
      </div>

      {/* Chat side */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "80px 52px 40px 16px" }}>

        {/* Greeting lines */}
        <div style={{ marginBottom: 32 }}>
          {NOVA_GREETINGS.map((g, i) => (
            <p key={i} style={{
              color: i === 0 ? "white" : i === 2 ? O : "rgba(255,255,255,0.5)",
              fontSize: i === 0 ? 38 : i === 2 ? 22 : 17,
              fontWeight: i === 0 ? 900 : i === 2 ? 600 : 400,
              margin: "0 0 10px",
              letterSpacing: i === 0 ? -1 : 0,
              lineHeight: 1.25,
              opacity: lines[i] ? 1 : 0,
              transform: lines[i] ? "translateY(0)" : "translateY(12px)",
              transition: "opacity 0.5s ease, transform 0.5s ease",
            }}>
              {g.text}
            </p>
          ))}
        </div>

        {/* Chat box */}
        <div style={{
          background: "rgba(0,0,0,0.72)",
          backdropFilter: "blur(20px)",
          border: `1px solid ${isListening ? OR(0.7) : isTalking ? OR(0.35) : OR(0.2)}`,
          borderRadius: 20,
          padding: "20px 22px",
          maxWidth: 680,
          boxShadow: isListening ? `0 0 0 2px ${OR(0.25)}, 0 0 28px ${OR(0.2)}` : undefined,
          opacity: lines[3] ? 1 : 0,
          transform: lines[3] ? "translateY(0)" : "translateY(14px)",
          transition: "opacity 0.5s ease 0.2s, transform 0.5s ease 0.2s, border-color 0.3s",
        }}>
          {/* Message history */}
          {messages.length > 0 && (
            <div style={{ maxHeight: 240, overflowY: "auto", marginBottom: 14, display: "flex", flexDirection: "column", gap: 9 }}>
              {messages.map((m, i) => (
                <div key={i} style={{ display: "flex", justifyContent: m.from === "user" ? "flex-end" : "flex-start" }}>
                  <div style={{
                    maxWidth: "84%",
                    padding: "9px 13px",
                    borderRadius: m.from === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                    background: m.from === "user" ? OR(0.18) : "rgba(255,255,255,0.06)",
                    border: m.from === "user" ? `1px solid ${OR(0.3)}` : "1px solid rgba(255,255,255,0.07)",
                    color: "rgba(255,255,255,0.85)",
                    fontSize: 13,
                    lineHeight: 1.6,
                  }}>
                    {m.text}
                    {m.streaming && <span style={{ opacity: 0.5, animation: "blink2 0.8s infinite" }}>▍</span>}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
          )}

          {/* Input row */}
          <div style={{ display: "flex", gap: 8 }}>
            {/* Mic button */}
            {voiceSupported && (
              <button
                onClick={startVoice}
                disabled={isTalking}
                title={isListening ? "Stop listening" : "Speak to Nova"}
                style={{
                  width: 44, height: 44, borderRadius: 11, flexShrink: 0,
                  background: isListening ? `linear-gradient(135deg, ${O}, ${OL})` : "rgba(255,255,255,0.06)",
                  border: `1px solid ${isListening ? OR(0.7) : OR(0.2)}`,
                  color: "white", cursor: isTalking ? "default" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.2s",
                  boxShadow: isListening ? `0 0 16px ${OR(0.5)}` : "none",
                  opacity: isTalking ? 0.4 : 1,
                  animation: isListening ? "micPulse 1s ease-in-out infinite alternate" : "none",
                }}
              >
                {isListening ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                    <rect x="6" y="4" width="4" height="16" rx="2"/>
                    <rect x="14" y="4" width="4" height="16" rx="2"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                    <rect x="9" y="2" width="6" height="12" rx="3"/>
                    <path d="M5 10a7 7 0 0 0 14 0"/>
                    <line x1="12" y1="19" x2="12" y2="22"/>
                    <line x1="9" y1="22" x2="15" y2="22"/>
                  </svg>
                )}
              </button>
            )}
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !isTalking && send()}
              placeholder={isListening ? "Listening…" : convId ? "Ask Nova anything, or tap the mic…" : "Connecting to Nova…"}
              disabled={!convId || isTalking}
              style={{
                flex: 1,
                padding: "12px 15px",
                borderRadius: 11,
                background: isListening ? OR(0.06) : "rgba(255,255,255,0.05)",
                border: `1px solid ${isListening ? OR(0.35) : "rgba(255,255,255,0.1)"}`,
                color: "white",
                fontSize: 13,
                outline: "none",
                fontFamily: "'Inter', sans-serif",
                opacity: (!convId || isTalking) ? 0.5 : 1,
                transition: "all 0.2s",
              }}
            />
            <button
              id="nova-send-btn"
              onClick={send}
              disabled={!input.trim() || !convId || isTalking}
              style={{
                padding: "12px 20px",
                borderRadius: 11,
                background: (input.trim() && convId && !isTalking) ? `linear-gradient(135deg, ${O}, ${OL})` : "rgba(255,255,255,0.07)",
                border: "none",
                color: "white",
                fontSize: 13,
                fontWeight: 700,
                cursor: (input.trim() && convId && !isTalking) ? "pointer" : "default",
                transition: "all 0.2s",
                boxShadow: (input.trim() && convId && !isTalking) ? `0 2px 12px ${OR(0.35)}` : "none",
              }}
            >
              {isTalking ? "…" : "Send"}
            </button>
          </div>

          <div style={{ marginTop: 10, color: "rgba(255,255,255,0.58)", fontSize: 12, letterSpacing: 0.2 }}>
            {voiceSupported
              ? <>Tap the mic and speak, or type — try: "What is NEXT?" · "Who is this for?"</>
              : <>Try: "What is NEXT?" · "Who is this for?" · "When do you launch?"</>
            }
          </div>
        </div>

        {/* Enter world link */}
        <div style={{ marginTop: 28, opacity: lines[3] ? 1 : 0, transition: "opacity 0.5s ease 0.6s" }}>
          <button
            onClick={onEnterLobby}
            style={{
              background: "transparent", border: "none",
              color: "rgba(255,255,255,0.28)", fontSize: 13,
              cursor: "pointer", padding: 0, transition: "color 0.2s",
              fontFamily: "'Inter', sans-serif",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.65)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.28)")}
          >
            ◈ Enter the Agent World →
          </button>
        </div>
      </div>

      <style>{`
        @keyframes novaIn { from{opacity:0;transform:translateX(-16px)} to{opacity:1;transform:translateX(0)} }
        @keyframes blink2 { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes talkPulse { from{opacity:0.4;transform:translateX(-50%) scale(0.9)} to{opacity:1;transform:translateX(-50%) scale(1.1)} }
        @keyframes talkDot { from{transform:scale(1)} to{transform:scale(1.6)} }
        @keyframes micPulse { from{box-shadow:0 0 8px ${OR(0.4)};} to{box-shadow:0 0 22px ${OR(0.8)}, 0 0 6px #fff2;} }
      `}</style>
    </div>
  );
}

function NovaLobby({ onEnterWorld, onAbout, onRook, onBackOffice, visitedAbout }: { onEnterWorld: () => void; onAbout: () => void; onRook: () => void; onBackOffice: () => void; visitedAbout: boolean }) {
  const [opening, setOpening] = useState(false);

  const handleOpen = () => {
    if (opening) return;
    setOpening(true);
    setTimeout(onEnterWorld, 1000);
  };

  return (
    <div style={{
      width: "100vw", height: "100vh",
      background: "linear-gradient(180deg, #0a0a0e 0%, #060609 60%, #020204 100%)",
      position: "relative", overflow: "hidden",
      fontFamily: "'Inter', sans-serif",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>

      {/* ── HEADER ── */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        padding: "18px 40px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        zIndex: 20,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: `linear-gradient(135deg, ${O}, ${OL})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 900, fontSize: 16, color: "white",
            boxShadow: `0 2px 12px ${OR(0.4)}`,
          }}>N</div>
          <span style={{ color: "white", fontWeight: 700, fontSize: 15 }}>NEXT</span>
          <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 13 }}>Level Solutions</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: O, boxShadow: `0 0 8px ${O}`, animation: "lobbyBlink 1.8s ease-in-out infinite" }} />
          <span style={{ color: O, fontSize: 11, fontWeight: 600, letterSpacing: 1.5 }}>AGENT WORLD</span>
        </div>
      </div>

      {/* ── DEEP PORTAL AURA — far back, massive ── */}
      <div style={{
        position: "absolute", left: "50%", top: "48%",
        transform: "translate(-50%, -50%)",
        width: 1100, height: 700,
        background: `radial-gradient(ellipse, ${OR(0.22)} 0%, ${OR(0.1)} 28%, ${OR(0.03)} 55%, transparent 72%)`,
        filter: "blur(70px)", zIndex: 1, pointerEvents: "none",
        animation: "lobbyAura 3.2s ease-in-out infinite",
      }} />
      {/* mid aura — tighter, brighter */}
      <div style={{
        position: "absolute", left: "50%", top: "46%",
        transform: "translate(-50%, -50%)",
        width: 600, height: 500,
        background: `radial-gradient(ellipse, ${OR(0.38)} 0%, ${OR(0.14)} 35%, transparent 65%)`,
        filter: "blur(40px)", zIndex: 1, pointerEvents: "none",
        animation: "lobbyAura 2.6s ease-in-out 0.4s infinite",
      }} />
      {/* floor light pool */}
      <div style={{
        position: "absolute", left: "50%", bottom: "8%",
        transform: "translateX(-50%)",
        width: 560, height: 80,
        background: `radial-gradient(ellipse, ${OR(0.3)} 0%, ${OR(0.08)} 50%, transparent 80%)`,
        filter: "blur(22px)", zIndex: 1, pointerEvents: "none",
        animation: "lobbyAura 3s ease-in-out 0.8s infinite",
      }} />
      {/* ceiling bleed */}
      <div style={{
        position: "absolute", left: "50%", top: "6%",
        transform: "translateX(-50%)",
        width: 400, height: 60,
        background: `radial-gradient(ellipse, ${OR(0.18)} 0%, transparent 70%)`,
        filter: "blur(20px)", zIndex: 1, pointerEvents: "none",
      }} />

      {/* ── CENTERED DOOR BOX ── */}
      <div style={{ position: "relative", width: 680, height: 640, zIndex: 5, marginTop: -30, flexShrink: 0 }}>

        {/* Corona halo tight around door */}
        <div style={{
          position: "absolute", inset: -28,
          background: "transparent",
          boxShadow: `0 0 60px 18px ${OR(0.28)}, 0 0 120px 40px ${OR(0.13)}, 0 0 220px 80px ${OR(0.06)}`,
          pointerEvents: "none", zIndex: 3,
          animation: "lobbyCrack 2.4s ease-in-out infinite",
        }} />

        {/* Outer frame border */}
        <div style={{
          position: "absolute", inset: -3,
          border: `1px solid ${OR(0.45)}`,
          boxShadow: `0 0 18px ${OR(0.35)}, inset 0 0 12px rgba(0,0,0,0.6)`,
          pointerEvents: "none", zIndex: 10,
        }} />

        {/* ── CRACK / LIGHT LEAK EFFECTS ── */}
        {/* Bottom crack line */}
        <div style={{ position: "absolute", bottom: -2, left: "3%", right: "3%", height: 2, background: `linear-gradient(to right, transparent, rgba(255,220,100,0.85) 18%, #fff8e0 50%, rgba(255,220,100,0.85) 82%, transparent)`, filter: "blur(0.4px)", animation: "lobbyCrack 2.4s ease-in-out infinite", zIndex: 11 }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "18%", background: `linear-gradient(to bottom, ${OR(0.55)}, transparent)`, filter: "blur(20px)", animation: "lobbyCrack 2.4s ease-in-out infinite", zIndex: 9 }} />
        {/* Top crack line */}
        <div style={{ position: "absolute", top: -2, left: "3%", right: "3%", height: 2, background: `linear-gradient(to right, transparent, rgba(255,200,80,0.75) 22%, rgba(255,230,130,0.9) 50%, rgba(255,200,80,0.75) 78%, transparent)`, filter: "blur(0.4px)", animation: "lobbyCrack 2.4s ease-in-out 0.1s infinite", zIndex: 11 }} />
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "12%", background: `linear-gradient(to top, transparent, ${OR(0.35)})`, filter: "blur(14px)", animation: "lobbyCrack 2.4s ease-in-out 0.1s infinite", zIndex: 9 }} />
        {/* Left edge crack */}
        <div style={{ position: "absolute", left: -2, top: "3%", bottom: "3%", width: 2, background: `linear-gradient(to bottom, transparent, rgba(255,190,60,0.9) 25%, rgba(255,230,120,1) 50%, rgba(255,190,60,0.9) 75%, transparent)`, filter: "blur(0.4px)", animation: "lobbyCrack 2.4s ease-in-out 0.2s infinite", zIndex: 11 }} />
        <div style={{ position: "absolute", left: 0, top: "3%", bottom: "3%", width: 28, background: `linear-gradient(to right, ${OR(0.5)}, transparent)`, filter: "blur(12px)", animation: "lobbyCrack 2.4s ease-in-out 0.2s infinite", zIndex: 9 }} />
        {/* Right edge crack */}
        <div style={{ position: "absolute", right: -2, top: "3%", bottom: "3%", width: 2, background: `linear-gradient(to bottom, transparent, rgba(255,190,60,0.9) 25%, rgba(255,230,120,1) 50%, rgba(255,190,60,0.9) 75%, transparent)`, filter: "blur(0.4px)", animation: "lobbyCrack 2.4s ease-in-out 0.35s infinite", zIndex: 11 }} />
        <div style={{ position: "absolute", right: 0, top: "3%", bottom: "3%", width: 28, background: `linear-gradient(to left, ${OR(0.5)}, transparent)`, filter: "blur(12px)", animation: "lobbyCrack 2.4s ease-in-out 0.35s infinite", zIndex: 9 }} />
        {/* Center seam — the split line */}
        <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 3, transform: "translateX(-50%)", background: `linear-gradient(to bottom, transparent 2%, ${OR(0.55)} 15%, rgba(255,240,160,0.95) 50%, ${OR(0.55)} 85%, transparent 98%)`, filter: "blur(1px)", zIndex: 8, opacity: opening ? 0 : 1, transition: "opacity 0.2s" }} />
        <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 14, transform: "translateX(-50%)", background: `linear-gradient(to bottom, transparent, ${OR(0.3)} 20%, ${OR(0.45)} 50%, ${OR(0.3)} 80%, transparent)`, filter: "blur(6px)", zIndex: 7, opacity: opening ? 0 : 1, transition: "opacity 0.2s" }} />

        {/* ── LEFT DOOR PANEL ── */}
        <div style={{
          position: "absolute", left: 0, top: 0, bottom: 0, width: "50%",
          background: `linear-gradient(155deg, #16161f 0%, #0e0e1a 45%, #141420 100%)`,
          transform: opening ? "translateX(-100%)" : "translateX(0)",
          transition: "transform 1s cubic-bezier(0.32,0,0.18,1)",
          overflow: "hidden", zIndex: 6,
        }}>
          {/* Full-door N wrapper — extends right by 100% so image spans full door, panel clips left half */}
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, right: "-100%", animation: "lobbyNGlow 2.6s ease-in-out infinite" }}>
            <img src={nextNLogo} alt="" style={{
              width: "100%", height: "100%",
              objectFit: "contain", objectPosition: "center",
              opacity: 0.92, mixBlendMode: "screen",
              pointerEvents: "none", userSelect: "none", display: "block",
            }} />
          </div>
          {/* Subtle inner shadow on seam edge */}
          <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 24, background: `linear-gradient(to left, ${OR(0.1)}, transparent)` }} />
          {/* Left handle */}
          <div style={{ position: "absolute", left: "18%", top: "50%", transform: "translateY(-50%)", width: 8, height: 90, background: "linear-gradient(to right, rgba(140,140,160,0.35), rgba(240,240,255,0.65), rgba(140,140,160,0.35))", borderRadius: 4, boxShadow: "0 2px 12px rgba(0,0,0,0.8)" }} />
        </div>

        {/* ── RIGHT DOOR PANEL ── */}
        <div style={{
          position: "absolute", right: 0, top: 0, bottom: 0, width: "50%",
          background: `linear-gradient(205deg, #141420 0%, #0e0e1a 45%, #16161f 100%)`,
          transform: opening ? "translateX(100%)" : "translateX(0)",
          transition: "transform 1s cubic-bezier(0.32,0,0.18,1)",
          overflow: "hidden", zIndex: 6,
        }}>
          {/* Full-door N wrapper — extends left by 100% so image spans full door, panel clips right half */}
          <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, left: "-100%", animation: "lobbyNGlow 2.6s ease-in-out 0.13s infinite" }}>
            <img src={nextNLogo} alt="" style={{
              width: "100%", height: "100%",
              objectFit: "contain", objectPosition: "center",
              opacity: 0.92, mixBlendMode: "screen",
              pointerEvents: "none", userSelect: "none", display: "block",
            }} />
          </div>
          {/* Subtle inner shadow on seam edge */}
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 24, background: `linear-gradient(to right, ${OR(0.1)}, transparent)` }} />
          {/* Right handle */}
          <div style={{ position: "absolute", right: "18%", top: "50%", transform: "translateY(-50%)", width: 8, height: 90, background: "linear-gradient(to right, rgba(140,140,160,0.35), rgba(240,240,255,0.65), rgba(140,140,160,0.35))", borderRadius: 4, boxShadow: "0 2px 12px rgba(0,0,0,0.8)" }} />
        </div>

        {/* World glow revealed when doors open */}
        <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at center, rgba(255,200,60,0.7) 0%, ${OR(0.5)} 20%, #060200 55%, #000 100%)`, zIndex: 4, opacity: opening ? 1 : 0, transition: "opacity 0.6s 0.35s" }} />
      </div>

      {/* ── BUTTON + SUBTITLE ── */}
      <div style={{
        position: "absolute", bottom: "11%", left: "50%",
        transform: "translateX(-50%)",
        zIndex: 10, textAlign: "center",
        opacity: opening ? 0 : 1, transition: "opacity 0.3s",
        whiteSpace: "nowrap",
      }}>
        <button
          onClick={handleOpen}
          className="lobby-btn"
          style={{
            padding: visitedAbout ? "16px 36px" : "16px 52px",
            borderRadius: 50,
            background: visitedAbout
              ? `linear-gradient(135deg, #22c55e, #16a34a)`
              : `linear-gradient(135deg, ${O}, ${OL})`,
            border: "none", color: "white",
            fontSize: visitedAbout ? 15 : 16, fontWeight: 700, cursor: "pointer",
            boxShadow: visitedAbout
              ? `0 4px 28px rgba(34,197,94,0.5)`
              : `0 4px 28px ${OR(0.5)}`,
            letterSpacing: 0.3, transition: "all 0.4s",
          }}
        >{visitedAbout ? "Now that you've read it, enter →" : "Open the Door"}</button>
        {!visitedAbout && (
          <div style={{ marginTop: 12, color: "rgba(255,255,255,0.25)", fontSize: 11, letterSpacing: 2.5, textTransform: "uppercase" }}>
            Enter the Agent World
          </div>
        )}
      </div>

      {/* ── ABOUT FRAME on right wall ── */}
      <div
        onClick={onAbout}
        className="lobby-frame"
        style={{
          position: "absolute", right: 60, top: "50%",
          transform: "translateY(-55%)",
          zIndex: 10, cursor: "pointer",
          opacity: opening ? 0 : 1, transition: "opacity 0.3s",
        }}
      >
        {/* "Before you enter" note above */}
        <div style={{ marginBottom: 10, textAlign: "center" }}>
          <div style={{ color: OR(0.55), fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 600 }}>Before you enter,</div>
          <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: 700, letterSpacing: 0.3, marginTop: 2 }}>check this out.</div>
        </div>
        {/* Frame */}
        <div className="lobby-frame-inner" style={{
          width: 110,
          padding: "10px 10px 12px",
          background: "rgba(4,2,1,0.92)",
          border: `1.5px solid ${OR(0.38)}`,
          borderRadius: 3,
          boxShadow: `0 0 20px ${OR(0.12)}, inset 0 0 16px rgba(0,0,0,0.7)`,
          transition: "all 0.25s",
        }}>
          {/* Photo */}
          <div style={{ width: "100%", aspectRatio: "4/3", overflow: "hidden", borderRadius: 2, position: "relative", marginBottom: 8 }}>
            <img src={teamPhoto} alt="NEXT Team" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 30%", filter: "brightness(0.8) sepia(0.15)" }} />
            <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.55))` }} />
          </div>
          {/* Plaque */}
          <div style={{ textAlign: "center", borderTop: `1px solid ${OR(0.22)}`, paddingTop: 7 }}>
            <div style={{ color: O, fontSize: 9, fontWeight: 700, letterSpacing: 1.8, textTransform: "uppercase" }}>About Us</div>
            <div style={{ color: "rgba(255,255,255,0.28)", fontSize: 8, marginTop: 2, letterSpacing: 0.5 }}>NEXT Level Solutions</div>
          </div>
        </div>
        {/* Wall hook */}
        <div style={{ width: 2, height: 10, background: OR(0.38), margin: "-1px auto 0", borderRadius: 1 }} />
      </div>

      {/* ── SECURE ACCESS — owner-only, bottom-left, barely visible ── */}
      <button
        onClick={onRook}
        title="Secure channel"
        style={{
          position: "absolute", bottom: 22, left: 26,
          background: "transparent", border: "none",
          color: "rgba(255,255,255,0.07)", fontSize: 11,
          cursor: "pointer", padding: "4px 8px",
          fontFamily: "'Inter', sans-serif",
          letterSpacing: 2.5, transition: "color 0.35s",
          display: "flex", alignItems: "center", gap: 5,
          zIndex: 20,
        }}
        onMouseEnter={e => { e.currentTarget.style.color = "rgba(220,38,38,0.55)"; }}
        onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.07)"; }}
      >
        🛡 SECURE
      </button>

      {/* ── HQ — admin-only, bottom-right ── */}
      <button
        onClick={onBackOffice}
        title="Mission Control"
        style={{
          position: "absolute", bottom: 22, right: 26,
          background: "transparent",
          border: `1px solid ${OR(0.25)}`,
          color: OR(0.45), fontSize: 11,
          cursor: "pointer", padding: "5px 12px",
          borderRadius: 6,
          fontFamily: "'Inter', sans-serif",
          letterSpacing: 2.5, transition: "all 0.3s",
          display: "flex", alignItems: "center", gap: 5,
          zIndex: 20,
        }}
        onMouseEnter={e => {
          e.currentTarget.style.color = "#fff";
          e.currentTarget.style.borderColor = OR(0.7);
          e.currentTarget.style.background = OR(0.1);
        }}
        onMouseLeave={e => {
          e.currentTarget.style.color = OR(0.45);
          e.currentTarget.style.borderColor = OR(0.25);
          e.currentTarget.style.background = "transparent";
        }}
      >
        ⬡ HQ
      </button>

      <style>{`
        @keyframes lobbyAura {
          0%,100% { opacity: 0.72; transform: translate(-50%,-50%) scale(1); }
          50%      { opacity: 1;    transform: translate(-50%,-50%) scale(1.04); }
        }
        @keyframes lobbyNGlow {
          0%,100% { opacity: 0.80; }
          50%      { opacity: 1; }
        }
        @keyframes lobbyCrack { 0%,100%{opacity:0.6} 50%{opacity:1} }
        @keyframes lobbyBlink  { 0%,100%{opacity:1} 50%{opacity:0.3} }
        .lobby-btn:hover  { transform: scale(1.05) !important; filter: brightness(1.12); }
        .lobby-btn:active { transform: scale(0.97) !important; }
        .lobby-frame:hover .lobby-frame-inner {
          border-color: ${OR(0.75)} !important;
          box-shadow: 0 0 30px ${OR(0.28)}, inset 0 0 16px rgba(0,0,0,0.7) !important;
        }
      `}</style>
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("door");
  const [visitedAbout, setVisitedAbout] = useState(false);

  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden", background: "#000" }}>
      {screen === "door"    && <PortalDoor onEnter={() => setScreen("opening")} />}
      {screen === "opening" && <OpeningAnimation onComplete={() => setScreen("nova")} />}
      {screen === "nova"    && <NovaGreeting onEnterLobby={() => setScreen("lobby")} />}
      {screen === "lobby"   && (
        <NovaLobby
          onEnterWorld={() => window.location.href = "/"}
          onAbout={() => setScreen("about")}
          onRook={() => setScreen("rook")}
          onBackOffice={() => setScreen("backoffice")}
          visitedAbout={visitedAbout}
        />
      )}
      {screen === "about"      && <AboutPage onBack={() => { setVisitedAbout(true); setScreen("lobby"); }} />}
      {screen === "rook"       && <RookCommandCenter onBack={() => setScreen("lobby")} />}
      {screen === "backoffice" && <BackOffice onBack={() => setScreen("lobby")} />}
    </div>
  );
}
