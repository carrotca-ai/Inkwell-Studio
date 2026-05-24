"use client";

import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import { TopBar } from "./top-bar";
import { BottomNav } from "./bottom-nav";
import { SideNav } from "./side-nav";
import { SettingsProvider } from "@/components/settings/settings-provider";
import { toggleChrome, useChrome } from "@/lib/chrome";
import { cn } from "@/lib/utils";

const HIDE_CHROME = ["/login"];
const HIDE_BOTTOM_ON = ["/edit/"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const chrome = useChrome();

  const hideAll = HIDE_CHROME.some((p) => pathname.startsWith(p));
  const routeHidesBottom = HIDE_BOTTOM_ON.some((p) => pathname.startsWith(p));

  if (hideAll) return <>{children}</>;

  const showBottom = !routeHidesBottom && !chrome.bottomHidden;
  const showTop = !chrome.topHidden;
  // Routes that own their own bottom-anchored input (chat) don't need the
  // global bottom padding that the floating prompt requires elsewhere.
  const ownsBottomOnDesktop = pathname.startsWith("/chat");

  return (
    <SettingsProvider>
      <div className="min-h-[100dvh] flex flex-col">
        <SideNav />

        {/* Mobile / tablet top-bar — hidden on lg+ where SideNav takes over. */}
        <div className="lg:hidden">
          <AnimatePresence>
            {showTop && (
              <motion.div
                key="top-bar"
                initial={{ y: -100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -120, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.34, 1.2, 0.64, 1] }}
              >
                <TopBar />
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {!showTop && (
              <motion.button
                key="top-peek"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => toggleChrome("topHidden")}
                className="fixed top-2 left-1/2 -translate-x-1/2 z-50 px-3 h-7 rounded-full bg-surface-container-high/80 border border-white/10 backdrop-blur-md flex items-center gap-1 text-on-surface-variant hover:text-white active:scale-95 transition-all"
                aria-label="Show top bar"
              >
                <ChevronDown className="w-3.5 h-3.5" strokeWidth={2} />
                <span className="text-label-sm">Show bar</span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        <main
          className={cn(
            "flex-1 w-full max-w-container-max mx-auto lg:max-w-none lg:mx-0 px-margin-mobile md:px-margin-desktop transition-[padding] duration-300 lg:pl-[calc(15rem+2rem)] lg:pr-8",
            showTop ? "pt-24" : "pt-10",
            "lg:pt-10",
            showBottom ? "pb-36" : "pb-10",
            ownsBottomOnDesktop ? "lg:pb-0" : "lg:pb-32"
          )}
        >
          {children}
        </main>

        {/* Mobile / tablet bottom-nav — hidden on lg+. */}
        <div className="lg:hidden">
          <AnimatePresence>
            {showBottom && (
              <motion.div
                key="bottom-nav"
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 120, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.34, 1.2, 0.64, 1] }}
              >
                <BottomNav />
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {chrome.bottomHidden && !routeHidesBottom && (
              <motion.button
                key="bottom-peek"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => toggleChrome("bottomHidden")}
                className="fixed bottom-2 left-1/2 -translate-x-1/2 z-50 px-3 h-7 rounded-full bg-surface-container-high/80 border border-white/10 backdrop-blur-md flex items-center gap-1 text-on-surface-variant hover:text-white active:scale-95 transition-all"
                aria-label="Show navigation"
              >
                <ChevronUp className="w-3.5 h-3.5" strokeWidth={2} />
                <span className="text-label-sm">Show nav</span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </SettingsProvider>
  );
}
