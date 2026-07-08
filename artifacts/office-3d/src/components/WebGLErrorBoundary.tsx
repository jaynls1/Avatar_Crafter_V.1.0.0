import { Component, ReactNode } from "react";

interface Props { children: ReactNode }
interface State { hasError: boolean; message: string }

export default class WebGLErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(err: Error): State {
    return { hasError: true, message: err.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          width: "100vw", height: "100vh", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", background: "#0d1117",
          color: "#e8e4d8", fontFamily: "system-ui, sans-serif", padding: 32, textAlign: "center",
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏢</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#c8a050", marginBottom: 8 }}>3D Office Room</h1>
          <p style={{ color: "#888", marginBottom: 24, maxWidth: 400, lineHeight: 1.6 }}>
            Your browser needs WebGL support to render the 3D office.<br />
            Please open this in a modern browser with hardware acceleration enabled.
          </p>
          <p style={{ fontSize: 12, color: "#555", background: "#1a1a2e", padding: "8px 14px", borderRadius: 6 }}>
            {this.state.message}
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
