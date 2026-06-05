import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Volume2, Power } from "lucide-react";
import { AppShell } from "@/components/lord/AppShell";
import { HudPanel } from "@/components/lord/HudPanel";
import { HudRings } from "@/components/lord/HudRings";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/voice")({
  head: () => ({ meta: [{ title: "LORD — Voice" }] }),
  component: VoicePage,
});

type VState = "idle" | "listening" | "thinking" | "speaking";

// Browser SpeechRecognition types are not in lib.dom — narrow access
type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
};

function getSR(): { new (): SpeechRecognitionLike } | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: { new (): SpeechRecognitionLike }; webkitSpeechRecognition?: { new (): SpeechRecognitionLike } };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function VoicePage() {
  const [state, setState] = useState<VState>("idle");
  const [wake, setWake] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [response, setResponse] = useState("");
  const [supported, setSupported] = useState(true);
  const recRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    const SR = getSR();
    if (!SR) {
      setSupported(false);
      return;
    }
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";

    rec.onresult = (e) => {
      let finalT = "";
      let interimT = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        const text = r[0].transcript;
        if (r.isFinal) finalT += text;
        else interimT += text;
      }
      if (interimT) setInterim(interimT);
      if (finalT) {
        setInterim("");
        setTranscript((p) => (p + " " + finalT).trim());
        // wake-word check
        if (wake && /hey,?\s*lord/i.test(finalT)) {
          const cmd = finalT.replace(/.*hey,?\s*lord[,.!?\s]*/i, "").trim();
          if (cmd) handleCommand(cmd);
        }
      }
    };
    rec.onend = () => {
      if (state === "listening" || wake) {
        try { rec.start(); } catch { /* noop */ }
      }
    };
    rec.onerror = () => { /* ignore — auto-restarts */ };
    recRef.current = rec;
    return () => {
      try { rec.stop(); } catch { /* noop */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wake]);

  const start = () => {
    if (!recRef.current) return;
    setState("listening");
    try { recRef.current.start(); } catch { /* noop */ }
  };
  const stop = () => {
    if (!recRef.current) return;
    setState("idle");
    try { recRef.current.stop(); } catch { /* noop */ }
  };

  const speak = (text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    setState("speaking");
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1; u.pitch = 1; u.volume = 1;
    u.onend = () => setState(wake ? "listening" : "idle");
    window.speechSynthesis.speak(u);
  };

  const handleCommand = async (cmd: string) => {
    setState("thinking");
    setResponse("");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "fast",
          messages: [{ id: "u", role: "user", parts: [{ type: "text", text: cmd }] }],
        }),
      });
      if (!res.body) throw new Error("No stream");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payload = trimmed.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const obj = JSON.parse(payload);
            if (obj.type === "text-delta" && typeof obj.delta === "string") {
              acc += obj.delta;
              setResponse(acc);
            }
          } catch { /* ignore */ }
        }
      }
      if (acc) speak(acc);
      else setState("idle");
    } catch {
      setState("idle");
      setResponse("Apologies, Sir — connection failed.");
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 text-center">
          <h1 className="font-display text-3xl md:text-4xl tracking-wide gradient-text text-glow">Voice Interface</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Say "<span className="text-primary">Hey Lord</span>" followed by your directive, or press to talk.
          </p>
        </div>

        <div className="flex flex-col items-center gap-6 hud-panel py-10">
          <HudRings size={260} state={state} />

          <div className="font-mono text-xs uppercase tracking-[0.3em] text-primary text-glow">
            {state === "listening" && "▮ Listening"}
            {state === "thinking" && "▮ Processing"}
            {state === "speaking" && "▮ Speaking"}
            {state === "idle" && "▯ Standby"}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {state === "listening" ? (
              <button onClick={stop} className="inline-flex items-center gap-2 rounded-md bg-destructive px-5 py-2.5 text-sm font-semibold text-destructive-foreground shadow-[0_0_20px_var(--destructive)] hover:scale-105 transition">
                <MicOff className="h-4 w-4" /> Stop
              </button>
            ) : (
              <button onClick={start} disabled={!supported} className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-[0_0_20px_var(--hud)] hover:scale-105 transition disabled:opacity-50">
                <Mic className="h-4 w-4" /> Push to Talk
              </button>
            )}
            <button
              onClick={() => { setWake((w) => !w); if (!wake) start(); else stop(); }}
              disabled={!supported}
              className={cn(
                "inline-flex items-center gap-2 rounded-md border px-5 py-2.5 text-sm font-semibold transition",
                wake ? "border-[var(--hud-success)] bg-[var(--hud-success)]/15 text-[var(--hud-success)]" : "border-primary/40 bg-primary/5 text-primary hover:bg-primary/10",
              )}
            >
              <Power className="h-4 w-4" /> Wake Word {wake ? "ON" : "OFF"}
            </button>
          </div>

          {!supported && (
            <p className="text-xs text-destructive">Speech recognition unsupported in this browser. Try Chrome.</p>
          )}
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <HudPanel title="Transcript" subtitle="Live capture">
            <div className="min-h-[120px] text-sm">
              {transcript || <span className="text-muted-foreground">—</span>}
              {interim && <span className="text-primary/70 italic"> {interim}</span>}
            </div>
            {transcript && (
              <div className="mt-3 flex gap-2">
                <button onClick={() => handleCommand(transcript)} className="text-xs text-primary hover:underline">Send to LORD →</button>
                <button onClick={() => { setTranscript(""); setInterim(""); }} className="text-xs text-muted-foreground hover:underline">Clear</button>
              </div>
            )}
          </HudPanel>
          <HudPanel title="Response" subtitle="LORD reply" action={response && <Volume2 className="h-4 w-4 text-primary" />}>
            <div className="min-h-[120px] text-sm whitespace-pre-wrap">
              {response || <span className="text-muted-foreground">—</span>}
            </div>
          </HudPanel>
        </div>
      </div>
    </AppShell>
  );
}
