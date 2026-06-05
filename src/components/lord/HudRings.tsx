import { cn } from "@/lib/utils";

interface HudRingsProps {
  state?: "idle" | "listening" | "thinking" | "speaking";
  size?: number;
  className?: string;
}

/** Animated arc-reactor rings for voice / status indicator */
export function HudRings({ state = "idle", size = 220, className }: HudRingsProps) {
  const colors: Record<string, string> = {
    idle: "var(--hud)",
    listening: "var(--hud-success)",
    thinking: "var(--accent)",
    speaking: "var(--hud-glow)",
  };
  const color = colors[state];

  return (
    <div
      className={cn("relative", className)}
      style={{ width: size, height: size }}
    >
      {/* outer rotating ring */}
      <svg
        className="absolute inset-0 animate-ring-rotate"
        viewBox="0 0 100 100"
        style={{ filter: `drop-shadow(0 0 12px ${color})` }}
      >
        <circle cx="50" cy="50" r="46" fill="none" stroke={color} strokeWidth="0.5" strokeDasharray="2 4" opacity="0.6" />
        <circle cx="50" cy="50" r="46" fill="none" stroke={color} strokeWidth="0.3" strokeDasharray="20 80" opacity="0.9" />
      </svg>
      {/* inner counter-rotating ring */}
      <svg className="absolute inset-2 animate-ring-rotate-reverse" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="0.4" strokeDasharray="1 3" opacity="0.5" />
        <circle cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="0.6" strokeDasharray="40 200" opacity="0.8" />
      </svg>
      {/* core */}
      <div
        className={cn(
          "absolute inset-0 m-auto rounded-full",
          state !== "idle" && "animate-pulse-glow",
        )}
        style={{
          width: size * 0.35,
          height: size * 0.35,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
          boxShadow: `0 0 40px ${color}, inset 0 0 20px ${color}`,
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          width: size * 0.15,
          height: size * 0.15,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background: color,
          boxShadow: `0 0 30px ${color}`,
        }}
      />
    </div>
  );
}
