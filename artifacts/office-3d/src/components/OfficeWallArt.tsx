import { Html, Image } from "@react-three/drei";
import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { fetchOfficeWallArt, safeHttpsUrl, type FramedWallArt } from "../lib/officeProducts";

function ProductFrame({ artwork }: { artwork: FramedWallArt }) {
  const [focused, setFocused] = useState(false);
  const [embedded, setEmbedded] = useState(false);
  const { position, orientation } = artwork.placement;
  const rotation = useMemo<[number, number, number]>(() => [orientation.x, orientation.y, orientation.z].map(THREE.MathUtils.degToRad) as [number, number, number], [orientation]);
  const activate = () => {
    const url = safeHttpsUrl(artwork.destinationUrl);
    if (!url) return;
    if (artwork.launchBehavior === "embedded") setEmbedded(true);
    else if (artwork.launchBehavior === "same-tab") window.location.assign(url.href);
    else window.open(url.href, "_blank", "noopener,noreferrer");
  };
  return <group position={[position.x, position.y, position.z]} rotation={rotation} scale={artwork.placement.scale} userData={{ surface: artwork.placement.surface }}>
    <mesh position={[0, 0, -0.055]} castShadow><boxGeometry args={[2.12, 1.58, 0.12]} /><meshStandardMaterial color={focused ? "#d7b45e" : "#50381f"} roughness={0.48} metalness={0.28} /></mesh>
    <mesh position={[0, 0, -0.005]}><planeGeometry args={[1.94, 1.4]} /><meshStandardMaterial color="#e7dfcf" roughness={0.8} /></mesh>
    <Image url={artwork.mediaUrl} position={[0, 0, 0.018]} scale={[1.72, 1.18]} transparent toneMapped={false} />
    <Html transform position={[0, 0, 0.055]} distanceFactor={6} style={{ pointerEvents: "auto" }}><button type="button" aria-label={artwork.accessibleName + ". " + artwork.shortDescription} onClick={activate} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onPointerEnter={() => setFocused(true)} onPointerLeave={() => setFocused(false)} style={{ width: 260, height: 180, border: 0, opacity: .001, cursor: "pointer" }} /></Html>
    {focused && <Html center position={[0, -1.02, .1]} distanceFactor={7} style={{ pointerEvents: "none", width: 240, padding: 10, borderRadius: 8, background: "rgba(5,7,12,.94)", border: "1px solid #c8a050", color: "white", textAlign: "center" }}><strong style={{ display: "block", color: "#f2d58a" }}>{artwork.accessibleName}</strong><span style={{ fontSize: 11 }}>{artwork.shortDescription}</span></Html>}
    {embedded && <Html fullscreen style={{ pointerEvents: "auto" }}><div role="dialog" aria-modal="true" aria-label={artwork.accessibleName} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "#05070c", display: "grid", gridTemplateRows: "auto 1fr" }}><div style={{ padding: 12, color: "white", display: "flex", justifyContent: "space-between" }}><strong>{artwork.accessibleName}</strong><button autoFocus onClick={() => setEmbedded(false)}>Close</button></div><iframe title={artwork.accessibleName} src={artwork.destinationUrl} sandbox="allow-forms allow-popups allow-same-origin allow-scripts" style={{ width: "100%", height: "100%", border: 0 }} /></div></Html>}
  </group>;
}
export default function OfficeWallArt({ officeSlug }: { officeSlug: string }) {
  const [artwork, setArtwork] = useState<FramedWallArt[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    fetchOfficeWallArt(officeSlug, controller.signal).then(setArtwork).catch((error) => {
      if (!(error instanceof DOMException && error.name === "AbortError")) console.error("[office-wall-art]", error);
    });
    return () => controller.abort();
  }, [officeSlug]);
  return <>{artwork.map((item) => <ProductFrame key={item.id} artwork={item} />)}</>;
}
