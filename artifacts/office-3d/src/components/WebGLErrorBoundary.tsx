import { Component, ReactNode } from "react";

interface Props { children: ReactNode }
interface State { hasError: boolean; message: string }

export function canUseWebGL(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

export function WebGLUnavailable({ message = "WebGL is not available on this device." }: { message?: string }) {
  return (
    <div style={{
      width: "100vw", height: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", background: "#0d1117",
      color: "#e8e4d8", fontFamily: "system-ui, sans-serif", padding: 32, textAlign: "center",
    }}>
      <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 4, color: "#c8a050", marginBottom: 16 }}>NEXT HQ</div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: "#c8a050", marginBottom: 8 }}>3D Office Room</h1>
      <p style={{ color: "#888", marginBottom: 24, maxWidth: 400, lineHeight: 1.6 }}>
        The 3D view needs WebGL and hardware acceleration.<br />
        You can still use the navigation controls on this page.
      </p>
      <p style={{ fontSize: 12, color: "#666", background: "#1a1a2e", padding: "8px 14px", borderRadius: 6 }}>
        {message}
      </p>
    </div>
  );
}

export default class WebGLErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(err: Error): State {
    return { hasError: true, message: err.message };
  }

  render() {
    if (this.state.hasError) {
      return <WebGLUnavailable message={this.state.message} />;
    }
    return this.props.children;
  }
}
