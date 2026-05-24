"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Sparkles, LoaderCircle } from "lucide-react";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh]" />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (res.ok) router.replace(params.get("from") || "/");
    else setError("Wrong password");
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-6">
      <motion.form
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        onSubmit={submit}
        className="w-full max-w-sm frosted-obsidian razor-edge rounded-[2rem] p-8 flex flex-col gap-6"
      >
        <div className="flex flex-col items-center gap-2">
          <Sparkles className="w-8 h-8 text-white" strokeWidth={1.5} />
          <h1 className="text-headline-lg-mobile font-semibold tracking-tight">Neural Studio</h1>
          <p className="text-label-md text-on-surface-variant">Enter password to continue</p>
        </div>
        <input
          autoFocus
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full bg-surface-container-low/60 border border-white/10 rounded-full px-5 py-3 text-body-md text-white placeholder:text-on-surface-variant/60 focus:outline-none focus:border-white/30 transition-colors"
        />
        {error && <p className="text-error text-label-md -mt-3 text-center">{error}</p>}
        <button
          type="submit"
          disabled={loading || !password}
          className="w-full bg-white text-black font-semibold rounded-full py-3 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-50"
        >
          {loading ? <LoaderCircle className="w-4 h-4 animate-spin" /> : "Enter"}
        </button>
      </motion.form>
    </div>
  );
}
