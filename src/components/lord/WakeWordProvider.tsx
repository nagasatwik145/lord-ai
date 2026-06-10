import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { getApiBaseUrl } from "@/lib/api-config";
import type { WakeEngine } from "@/lib/voice/wake-engine";

export type WakeStatus = "off" | "listening" | "heard" | "thinking" | "speaking" | "unsupported";

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult:
    | ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void)
    | null;
  onend: (() => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
};

function getSR(): { new (): SpeechRecognitionLike } | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: { new (): SpeechRecognitionLike };
    webkitSpeechRecognition?: { new (): SpeechRecognitionLike };
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

type Ctx = {
  enabled: boolean;
  status: WakeStatus;
  transcript: string;
  reply: string;
  supported: boolean;
  engineName: string;
  toggle: () => void;
  setEnabled: (v: boolean) => void;
};

const WakeWordContext = createContext<Ctx | null>(null);

export function useWakeWord() {
  const c = useContext(WakeWordContext);
  if (!c) throw new Error("useWakeWord must be used inside WakeWordProvider");
  return c;
}

export function WakeWordProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabledState] = useState(false);
  const [status, setStatus] = useState<WakeStatus>("off");
  const [transcript, setTranscript] = useState("");
  const [reply, setReply] = useState("");
  const [supported, setSupported] = useState(true);
  const [engineName, setEngineName] = useState("openwakeword");

  const engineRef = useRef<WakeEngine | null>(null);
  const enabledRef = useRef(false);
  const busyRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem("lord:wakeword.enabled");
      if (stored === "1") setEnabledState(true);
    } catch {
      /* noop */
    }
  }, []);

  const setEnabled = useCallback((v: boolean) => {
    setEnabledState(v);
    try {
      localStorage.setItem("lord:wakeword.enabled", v ? "1" : "0");
    } catch {
      /* noop */
    }
  }, []);

  const speak = useCallback((text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    setStatus("speaking");
    engineRef.current?.pause();
    const u = new SpeechSynthesisUtterance(text);
    let rate = 1;
    try {
      const r = localStorage.getItem("lord:settings.voiceRate");
      if (r) rate = JSON.parse(r);
    } catch {
      /* noop */
    }
    u.rate = rate;
    u.pitch = 1;
    u.volume = 1;
    u.onend = () => {
      busyRef.current = false;
      engineRef.current?.resume();
      setStatus(enabledRef.current ? "listening" : "off");
    };
    window.speechSynthesis.speak(u);
  }, []);

  const handleCommand = useCallback(
    async (cmd: string) => {
      busyRef.current = true;
      setStatus("thinking");
      setReply("");
      try {
        // Use a consistent conversation ID for voice commands
        const voiceConvoId = "voice-session";
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "fast",
            conversationId: voiceConvoId,
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
                setReply(acc);
              }
            } catch {
              /* ignore */
            }
          }
        }
        if (acc) speak(acc);
        else {
          busyRef.current = false;
          engineRef.current?.resume();
          setStatus(enabledRef.current ? "listening" : "off");
        }
      } catch {
        setReply("Apologies, Sir — connection failed.");
        busyRef.current = false;
        engineRef.current?.resume();
        setStatus(enabledRef.current ? "listening" : "off");
      }
    },
    [speak],
  );

  /**
   * After OpenWakeWord fires, open a short Web Speech window to capture
   * the user's command. (The Web Speech recognizer is also used by the
   * fallback engine; it's the simplest free STT in browsers / WebView.)
   */
  const captureCommand = useCallback(() => {
    if (busyRef.current) return;
    const SR = getSR();
    if (!SR) {
      // No STT available — just acknowledge and bail.
      speak("Yes Sir, but I have no speech-to-text available in this browser.");
      return;
    }
    busyRef.current = true;
    setStatus("heard");
    engineRef.current?.pause();
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = "en-US";
    let captured = "";
    const timeout = window.setTimeout(() => {
      try {
        rec.stop();
      } catch {
        /* noop */
      }
    }, 6000);
    rec.onresult = (e) => {
      let finalT = "";
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalT += r[0].transcript;
        else interim += r[0].transcript;
      }
      const all = (finalT || interim).trim();
      if (all) setTranscript(all);
      if (finalT.trim()) {
        captured = finalT.trim();
        try {
          rec.stop();
        } catch {
          /* noop */
        }
      }
    };
    rec.onend = () => {
      window.clearTimeout(timeout);
      if (captured) {
        void handleCommand(captured);
      } else {
        busyRef.current = false;
        engineRef.current?.resume();
        setStatus(enabledRef.current ? "listening" : "off");
      }
    };
    rec.onerror = () => {
      window.clearTimeout(timeout);
      busyRef.current = false;
      engineRef.current?.resume();
      setStatus(enabledRef.current ? "listening" : "off");
    };
    try {
      rec.start();
    } catch {
      busyRef.current = false;
      engineRef.current?.resume();
      setStatus(enabledRef.current ? "listening" : "off");
    }
  }, [handleCommand, speak]);

  // Lifecycle: start/stop the wake engine when `enabled` flips.
  useEffect(() => {
    enabledRef.current = enabled;
    if (typeof window === "undefined") return;

    let cancelled = false;

    if (!enabled) {
      setStatus("off");
      const eng = engineRef.current;
      engineRef.current = null;
      if (eng) void eng.stop();
      return;
    }

    (async () => {
      try {
        setStatus("listening");
        const { createWakeEngine } = await import("@/lib/voice");
        const eng = await createWakeEngine(() => {
          captureCommand();
        });
        if (cancelled) {
          await eng.stop();
          return;
        }
        engineRef.current = eng;
        setEngineName(eng.name);
        setSupported(true);
      } catch (err) {
        console.error("[LORD] wake engine failed:", err);
        setSupported(false);
        setStatus("unsupported");
        setEnabled(false);
      }
    })();

    return () => {
      cancelled = true;
      const eng = engineRef.current;
      engineRef.current = null;
      if (eng) void eng.stop();
    };
  }, [enabled, captureCommand, setEnabled]);

  const toggle = useCallback(() => setEnabled(!enabledRef.current), [setEnabled]);

  return (
    <WakeWordContext.Provider
      value={{ enabled, status, transcript, reply, supported, engineName, toggle, setEnabled }}
    >
      {children}
    </WakeWordContext.Provider>
  );
}
