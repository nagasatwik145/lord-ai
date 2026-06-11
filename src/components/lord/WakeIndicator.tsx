import { Mic, MicOff } from "lucide-react";
import { useState } from "react";

/**
 * WakeIndicator - Shows voice input status in the corner
 */
export function WakeIndicator() {
  const [listening, setListening] = useState(false);

  return (
    <button
      onClick={() => setListening(!listening)}
      className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full transition-all"
      style={{
        background: listening ? "var(--hud)" : "var(--background)",
        border: "2px solid var(--hud)",
        boxShadow: listening ? "0 0 20px var(--hud)" : "none",
      }}
      title="Voice input"
    >
      {listening ? (
        <Mic className="h-5 w-5 text-background animate-pulse" />
      ) : (
        <MicOff className="h-5 w-5 text-muted-foreground" />
      )}
    </button>
  );
}
