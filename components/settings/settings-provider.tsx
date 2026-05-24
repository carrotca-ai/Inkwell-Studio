"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { SettingsSheet } from "./settings-sheet";

type Ctx = { open: () => void; close: () => void };

const SettingsCtx = createContext<Ctx>({ open: () => {}, close: () => {} });

export function useSettingsSheet() {
  return useContext(SettingsCtx);
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const value: Ctx = {
    open: useCallback(() => setOpen(true), []),
    close: useCallback(() => setOpen(false), []),
  };

  return (
    <SettingsCtx.Provider value={value}>
      {children}
      <SettingsSheet open={open} onClose={() => setOpen(false)} />
    </SettingsCtx.Provider>
  );
}
