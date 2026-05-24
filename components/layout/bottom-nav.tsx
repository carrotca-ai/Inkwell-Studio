"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Moon, MessageSquare, Pencil, LayoutGrid, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { toggleChrome } from "@/lib/chrome";

const ITEMS = [
  // /edit/[id] is the image viewer launched from Studio, not a sibling route.
  {
    href: "/",
    label: "Studio",
    icon: Moon,
    matches: (p: string) => p === "/" || p === "/edit" || p.startsWith("/edit/"),
  },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/editor", label: "Editor", icon: Pencil },
  { href: "/vault", label: "Vault", icon: LayoutGrid },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <motion.nav
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.1, ease: [0.34, 1.56, 0.64, 1] }}
      className="fixed bottom-4 left-4 right-4 z-50 max-w-container-max mx-auto"
    >
      {/* Collapse handle — slides the whole nav out of the viewport. */}
      <button
        onClick={() => toggleChrome("bottomHidden")}
        className="absolute -top-2 right-4 z-10 w-7 h-7 rounded-full bg-surface-container-high/90 border border-white/10 backdrop-blur-md flex items-center justify-center text-on-surface-variant hover:text-white active:scale-90 transition-all"
        aria-label="Hide navigation"
        title="Hide navigation"
      >
        <ChevronDown className="w-3.5 h-3.5" strokeWidth={2} />
      </button>

      <div
        className="flex justify-around items-center px-4 py-3 bg-surface-container-low/80 backdrop-blur-xl rounded-full border border-white/10"
        style={{ boxShadow: "0 10px 40px rgba(0,0,0,0.5)" }}
      >
        {ITEMS.map((item) => {
          const active = item.matches ? item.matches(pathname) : pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center rounded-full px-6 py-2 transition-all duration-300 active:scale-90 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
                active
                  ? "bg-secondary-container text-white"
                  : "text-on-surface-variant hover:text-white hover:bg-surface-bright/40"
              )}
            >
              <Icon className="w-5 h-5 mb-1" strokeWidth={1.5} />
              <span className="text-label-sm tracking-widest font-bold">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </motion.nav>
  );
}
