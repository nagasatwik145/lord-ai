import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

export type WakeStatus = "off" | "listening" | "heard" | "thinking" | "speaking" | "unsupported";

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onstart: (() => void) | null;
};

function getSR(): { new (): SpeechRecognitionLike } | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: { new (): SpeechRecognitionLike }; webkitSpeechRecognition?: { new (): SpeechRecognitionLike } };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const WAKE_REGEX = /\b(hey|ok|okay)[,!.\s]+lord\b/i;

type Ctx = {
  enabled: boolean;
  status: WakeStatus;
  transcript: string;
  reply: string;
  supported: boolean;
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

  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const enabledRef = useRef(false);
  const busyRef = useRef(false); // when handling a command, pause wake detection
  const restartTimerRef = useRef<number | null>(null);

  // load persisted preference
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem("lord:wakeword.enabled");
      if (stored === "1") setEnabledState(true);
    } catch { /* noop */ }
  }, []);

  const setEnabled = useCallback((v: boolean) => {
    setEnabledState(v);
    try { localStorage.setItem("lord:wakeword.enabled", v ? "1" : "0"); } catch { /* noop */ }
  }, []);

  const speak = useCallback((text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    setStatus("speaking");
    const u = new SpeechSynthesisUtterance(text);
    let rate = 1;
    try {
      const r = localStorage.getItem("lord:settings.voiceRate");
      if (r) rate = JSON.parse(r);
    } catch { /* noop */ }
    u.rate = rate; u.pitch = 1; u.volume = 1;
    u.onend = () => {
      busyRef.current = false;
      setStatus(enabledRef.current ? "listening" : "off");
    };
    window.speechSynthesis.speak(u);
  }, []);

  const handleCommand = useCallback(async (cmd: string) => {
    busyRef.current = true;
    setStatus("thinking");
    setReply("");
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
              setReply(acc);
            }
          } catch { /* ignore */ }
        }
      }
      if (acc) speak(acc);
      else {
        busyRef.current = false;
        setStatus(enabledRef.current ? "listening" : "off");
      }
    } catch {
      setReply("Apologies, Sir — connection failed.");
      busyRef.current = false;
      setStatus(enabledRef.current ? "listening" : "off");
    }
  }, [speak]);

  // Manage recognizer lifecycle in response to `enabled`
  useEffect(() => {
    enabledRef.current = enabled;
    if (typeof window === "undefined") return;

    const SR = getSR();
    if (!SR) {
      setSupported(false);
      setStatus("unsupported");
      return;
    }

    if (!enabled) {
      setStatus("off");
      const rec = recRef.current;
      if (rec) {
        try { rec.abort(); } catch { /* noop */ }
      }
      return;
    }

    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    recRef.current = rec;

    rec.onstart = () => {
      if (!busyRef.current) setStatus("listening");
    };
    rec.onresult = (e) => {
      if (busyRef.current) return;
      let finalT = "";
      let interimT = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        const text = r[0].transcript;
        if (r.isFinal) finalT += text;
        else interimT += text;
      }
      const combined = (finalT || interimT).trim();
      if (combined) setTranscript(combined);
      if (finalT && WAKE_REGEX.test(finalT)) {
        setStatus("heard");
        const cmd = finalT.replace(/.*?(hey|ok|okay)[,!.\s]+lord[,.!?\s]*/i, "").trim();
        if (cmd) {
          void handleCommand(cmd);
        } else {
          // wake only — wait briefly for next utterance as command
          busyRef.current = true;
          setStatus("listening");
          const next = (ev: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => {
            let f = "";
            for (let i = ev.resultIndex; i < ev.results.length; i++) {
              const r = ev.results[i];
              if (r.isFinal) f += r[0].transcript;
            }
            if (f.trim()) {
              rec.onresult = baseHandler;
              void handleCommand(f.trim());
            }
          };
          const baseHandler = rec.onresult;
          rec.onresult = next;
          setTimeout(() => {
            if (rec.onresult === next) {
              rec.onresult = baseHandler;
              busyRef.current = false;
            }
          }, 6000);
        }
      }
    };
    rec.onend = () => {
      if (enabledRef.current) {
        if (restartTimerRef.current) window.clearTimeout(restartTimerRef.current);
        restartTimerRef.current = window.setTimeout(() => {
          try { rec.start(); } catch { /* noop */ }
        }, 250);
      } else {
        setStatus("off");
      }
    };
    rec.onerror = (e) => {
      if (e?.error === "not-allowed" || e?.error === "service-not-allowed") {
        setEnabled(false);
        setStatus("off");
      }
    };

    try { rec.start(); } catch { /* noop */ }

    return () => {
      enabledRef.current = false;
      if (restartTimerRef.current) window.clearTimeout(restartTimerRef.current);
      try { rec.abort(); } catch { /* noop */ }
    };
  }, [enabled, handleCommand, setEnabled]);

  const toggle = useCallback(() => setEnabled(!enabledRef.current), [setEnabled]);

  return (
    <WakeWordContext.Provider value={{ enabled, status, transcript, reply, supported, toggle, setEnabled }}>
      {children}
    </WakeWordContext.Provider>
  );
}
