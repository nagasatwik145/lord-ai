import type React from "react";
import { createContext, useContext, ReactNode } from "react";

/**
 * WakeWordProvider - Context for wake word state management.
 * Manages the "Hey Lord" voice activation state.
 */
const WakeWordContext = createContext<{ isListening: boolean } | undefined>(undefined);

export function WakeWordProvider({ children }: { children: ReactNode }) {
  return (
    <WakeWordContext.Provider value={{ isListening: false }}>
      {children}
    </WakeWordContext.Provider>
  );
}

export function useWakeWord() {
  const context = useContext(WakeWordContext);
  if (!context) {
    throw new Error("useWakeWord must be used within WakeWordProvider");
  }
  return context;
}
