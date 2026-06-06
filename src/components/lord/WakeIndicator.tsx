import { Mic, MicOff, Loader2, Volume2, Sparkles } from "lucide-react";
import { useWakeWord } from "./WakeWordProvider";
import { cn } from "@/lib/utils";

export function WakeIndicator() {
  const { enabled, status, toggle, supported, transcript } = useWakeWord();

  const label =
    status === "unsupported" ? "Unsupported" :
    status === "off" ? "Wake OFF" :
    status === "listening" ? "Listening · Say 'Hey Lord'" :
    status === "heard" ? "Yes, Sir?" :
    status === "thinking" ? "Processing" :
    status === "speaking" ? "Replying" : "";

  const tone =
    status === "listening" ? "text-[var(--hud)] border-[var(--hud)]/60 shadow-[0_0_24px_var(--hud)]" :
    status === "heard" ? "text-[var(--hud-warning)] border-[var(--hud-warning)]/60 shadow-[0_0_30px_var(--hud-warning)]" :
    status === "thinking" ? "text-primary border-primary/60" :
    status === "speaking" ? "text-[var(--hud-success)] border-[var(--hud-success)]/60 shadow-[0_0_24px_var(--hud-success)]" :
    "text-muted-foreground border-border/60";

  const Icon =
    status === "speaking" ? Volume2 :
    status === "thinking" ? Loader2 :
    status === "heard" ? Sparkles :
    enabled ? Mic : MicOff;

  return (
    <button
      onClick={toggle}
      disabled={!supported}
      className={cn(
        "fixed bottom-20 right-3 z-50 md:bottom-6 md:right-6",
        "flex items-center gap-2 rounded-full border bg-background/80 backdrop-blur-xl px-3 py-2 text-xs font-mono uppercase tracking-wider transition",
        tone,
        !supported && "opacity-50 cursor-not-allowed",
      )}
      title={transcript || label}
    >
      <span className="relative flex h-5 w-5 items-center justify-center">
        {enabled && (status === "listening" || status === "heard") && (
          <span className="absolute inset-0 rounded-full bg-current opacity-20 animate-ping" />
        )}
        <Icon className={cn("h-4 w-4 relative", status === "thinking" && "animate-spin")} />
      </span>
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
