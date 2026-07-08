import { useEffect, useRef } from "react";
import { useStore } from "../store/useStore";
import type { RoomConfig } from "../lib/api";

type AgentConfig = RoomConfig["agentConfig"];
type FurnitureConfig = RoomConfig["furnitureConfig"];
type ToolConfig = RoomConfig["tools"][0];

export type CameraView = "auto" | "desk" | "agent" | "wall" | "overhead" | "wide";

export function useRoomEvents(
  slug: string,
  onCamera?: (view: CameraView) => void,
) {
  const { setAgent, setFurniture, setTools } = useStore();
  const onCameraRef = useRef(onCamera);
  onCameraRef.current = onCamera;

  useEffect(() => {
    if (!slug) return;

    const es = new EventSource(`/api/rooms/${slug}/events`);

    es.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data) as {
          type: string;
          room?: { agentConfig: AgentConfig; furnitureConfig: FurnitureConfig; tools: ToolConfig[] };
          view?: CameraView;
        };

        if (msg.type === "update" && msg.room) {
          const { agentConfig, furnitureConfig, tools } = msg.room;
          setAgent(agentConfig);
          setFurniture(furnitureConfig);
          setTools(tools);
        }

        if (msg.type === "camera" && msg.view) {
          onCameraRef.current?.(msg.view);
        }
      } catch {
        // Ignore parse errors
      }
    };

    return () => es.close();
  }, [slug, setAgent, setFurniture, setTools]);
}
