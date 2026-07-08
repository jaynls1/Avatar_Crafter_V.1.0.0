import { useParams, useLocation } from "wouter";
import NovaOffice from "./offices/NovaOffice";
import SniperOffice from "./offices/SniperOffice";
import MemeOffice from "./offices/MemeOffice";
import ScribeOffice from "./offices/ScribeOffice";
import IndyOffice from "./offices/IndyOffice";
import RookOffice from "./offices/RookOffice";
import IggyOffice from "./offices/IggyOffice";
import AnchorOffice from "./offices/AnchorOffice";
import HavenOffice from "./offices/HavenOffice";

const OFFICES: Record<string, React.ComponentType> = {
  nova:   NovaOffice,
  sniper: SniperOffice,
  meme:   MemeOffice,
  scribe: ScribeOffice,
  indy:   IndyOffice,
  rook:   RookOffice,
  iggy:   IggyOffice,
  anchor: AnchorOffice,
  haven:  HavenOffice,
};

export default function OfficePage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const OfficeComponent = OFFICES[id || ""];

  if (!OfficeComponent) {
    return (
      <div style={{ width: "100vw", height: "100vh", background: "#0d1117", display: "flex", alignItems: "center", justifyContent: "center", color: "#e8e4d8", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🚧</div>
          <h1 style={{ color: "#c8a050", marginBottom: 8 }}>Office Under Construction</h1>
          <p style={{ color: "#888", marginBottom: 24 }}>"{id}" hasn't been built yet.</p>
          <button onClick={() => navigate("/")} style={{ padding: "10px 22px", borderRadius: 8, border: "1px solid rgba(200,160,80,0.4)", background: "rgba(200,160,80,0.1)", color: "#c8a050", cursor: "pointer", fontSize: 14 }}>
            ← Back to Lobby
          </button>
        </div>
      </div>
    );
  }

  return <OfficeComponent />;
}
