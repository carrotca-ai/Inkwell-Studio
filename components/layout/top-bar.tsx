"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Triangle, Settings as SettingsIcon, ChevronUp } from "lucide-react";
import { useSettingsSheet } from "@/components/settings/settings-provider";
import { toggleChrome } from "@/lib/chrome";

export function TopBar() {
  const sheet = useSettingsSheet();

  return (
    <motion.header
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
      className="fixed top-4 left-4 right-4 z-50 flex items-center justify-between px-6 h-16 bg-surface/70 backdrop-blur-xl rounded-full border border-white/10 max-w-container-max mx-auto"
      style={{ boxShadow: "0 20px 40px rgba(0,0,0,0.4)" }}
    >
      <Link
        href="/"
        className="flex items-center gap-2 active:scale-95 duration-200 ease-in-out transition-transform"
        aria-label="Home"
      >
        <Triangle className="w-5 h-5 text-white" strokeWidth={1.8} />
      </Link>

      <div className="flex-1 flex items-center justify-center">
        <span className="text-headline-lg-mobile md:text-headline-lg font-semibold tracking-tight">
          Neural Studio
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={sheet.open}
          className="w-9 h-9 rounded-full bg-surface-container-high/60 razor-edge flex items-center justify-center text-white active:scale-95 hover:bg-surface-container-high transition-all"
          aria-label="Settings"
        >
          <SettingsIcon className="w-4 h-4" strokeWidth={1.8} />
        </button>
        <button
          onClick={() => toggleChrome("topHidden")}
          className="w-9 h-9 rounded-full bg-surface-container-high/60 razor-edge flex items-center justify-center text-on-surface-variant hover:text-white active:scale-95 hover:bg-surface-container-high transition-all"
          aria-label="Hide top bar"
          title="Hide top bar"
        >
          <ChevronUp className="w-4 h-4" strokeWidth={1.8} />
        </button>
      </div>
    </motion.header>
  );
}
