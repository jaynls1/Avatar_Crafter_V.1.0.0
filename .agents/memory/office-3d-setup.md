---
name: Office-3D artifact setup
description: Key quirks and decisions for the artifacts/office-3d artifact (Virtual Office 3D).
---

## Wouter routing with BASE_URL
The artifact runs at `/office-3d/`. Wrap routes in `<Router base={import.meta.env.BASE_URL.replace(/\/$/, "")}>` so wouter can handle sub-paths like `/admin`, `/camera`, `/atlas`.

**Why:** Without the base, wouter path matching fails entirely under the `/office-3d/` prefix.

**How to apply:** `main.tsx` must import `{ Router }` from wouter and wrap `<Switch>` with it.

## Public assets must use BASE_URL
Any asset in `artifacts/office-3d/public/` (e.g. `public/avatars/*.png`) must be referenced as `` `${import.meta.env.BASE_URL}avatars/idle.png` `` not `/avatars/idle.png`.

**Why:** Vite serves public files relative to `base` (`/office-3d/`), so root-absolute paths fail.

## AdminPage href links
The Admin page `<a href>` links for rooms must prefix with `import.meta.env.BASE_URL.replace(/\/$/, "")` so they route correctly under `/office-3d/`.

## Three.js deprecation warnings
PCFSoftShadowMap and THREE.Clock are deprecated in Three.js ≥ 0.183. These are harmless warnings from @react-three/fiber internals — not from our code.

## WebGL in headless screenshot
The screenshot tool uses a headless browser with no GPU — the WebGL fallback screen ("WebGL context could not be created") is expected in CI/preview screenshots. Real browsers render the 3D scene normally.
