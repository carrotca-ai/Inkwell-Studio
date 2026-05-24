"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Moon, MessageSquare, Pencil, LayoutGrid, Triangle, Settings as SettingsIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettingsSheet } from "@/components/settings/settings-provider";

const ITEMS = [
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

export function SideNav() {
  const pathname = usePathname();
  const sheet = useSettingsSheet();

  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.34, 1.2, 0.64, 1] }}
      className="hidden lg:flex fixed top-0 bottom-0 left-0 z-40 w-60 flex-col px-5 py-6 border-r border-white/5 bg-surface-container-lowest/40 backdrop-blur-xl"
    >
      <Link
        href="/"
        className="flex items-center gap-2.5 px-3 py-2 mb-6 active:scale-95 transition-transform"
      >
        <Triangle className="w-5 h-5 text-white" strokeWidth={1.8} />
        <span className="text-body-lg font-semibold tracking-tight text-white">
          Inkwell Studio
        </span>
      </Link>

      <nav className="flex flex-col gap-1">
        {ITEMS.map((item) => {
          const active = item.matches ? item.matches(pathname) : pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-2xl text-label-md transition-colors",
                active
                  ? "bg-secondary-container text-white"
                  : "text-on-surface-variant hover:text-white hover:bg-white/[0.04]"
              )}
            >
              <Icon className="w-4 h-4" strokeWidth={1.8} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto">
        <button
          onClick={sheet.open}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-label-md text-on-surface-variant hover:text-white hover:bg-white/[0.04] transition-colors"
        >
          <SettingsIcon className="w-4 h-4" strokeWidth={1.8} />
          Settings
        </button>
      </div>
    </motion.aside>
  );
}
