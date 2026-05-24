/**
 * In-memory key pool with round-robin rotation and dead-list. The pool is
 * composed per-request from env (KIE_API_KEYS) and client-supplied keys.
 * State resets on cold start, which is fine — cold starts re-validate keys
 * naturally on first use.
 */

import { createTask, isKeyFault, KieError, pollTask, type TaskInput } from "./kie";

const STATUS = new Map<string, KeyStatus>();

type KeyStatus = {
  cooldownUntil: number;
  dead?: "auth" | "quota";
  lastError?: string;
  credits?: number;
};

function parseEnvKeys(): string[] {
  const raw = process.env.KIE_API_KEYS || process.env.KIE_API_KEY || "";
  return raw
    .split(/[\s,;]+/)
    .map((k) => k.trim())
    .filter(Boolean);
}

export function buildPool(extraKeys: string[] = []): string[] {
  const env = parseEnvKeys();
  const merged = [...env, ...extraKeys.map((k) => k.trim()).filter(Boolean)];
  return [...new Set(merged)];
}

function isHealthy(key: string): boolean {
  const s = STATUS.get(key);
  if (!s) return true;
  if (s.dead) return false;
  if (s.cooldownUntil && Date.now() < s.cooldownUntil) return false;
  return true;
}

export function listKeyStatuses(keys: string[]) {
  return keys.map((key) => ({
    key,
    healthy: isHealthy(key),
    ...(STATUS.get(key) || {}),
  }));
}

export function markCredits(key: string, credits: number) {
  const cur = STATUS.get(key) || { cooldownUntil: 0 };
  cur.credits = credits;
  if (credits <= 0) {
    cur.dead = "quota";
    cur.lastError = "No credits remaining";
  }
  STATUS.set(key, cur);
}

function markFailure(key: string, err: unknown) {
  const fault = isKeyFault(err);
  const cur: KeyStatus = STATUS.get(key) || { cooldownUntil: 0 };
  cur.lastError = err instanceof Error ? err.message : String(err);
  if (fault === "auth") cur.dead = "auth";
  else if (fault === "quota") cur.dead = "quota";
  else if (fault === "rate") cur.cooldownUntil = Date.now() + 30_000;
  STATUS.set(key, cur);
}

function markSuccess(key: string) {
  const cur = STATUS.get(key);
  if (cur) cur.cooldownUntil = 0;
}

export type RunResult = {
  urls: string[];
  keyUsed: string;
  attempted: number;
};

export class NoKeysError extends Error {
  constructor() {
    super("No usable kie.ai keys. Add at least one in Settings or KIE_API_KEYS env.");
    this.name = "NoKeysError";
  }
}

export async function runTask(
  pool: string[],
  model: string,
  input: TaskInput,
  pollOpts?: Parameters<typeof pollTask>[2]
): Promise<RunResult> {
  if (!pool.length) throw new NoKeysError();

  const healthy = pool.filter(isHealthy);
  const queue = healthy.length ? healthy : pool;

  let lastError: unknown = null;
  let attempted = 0;

  for (const key of queue) {
    attempted++;
    try {
      const { taskId } = await createTask(key, model, input);
      const urls = await pollTask(key, taskId, pollOpts);
      markSuccess(key);
      return { urls, keyUsed: key, attempted };
    } catch (err) {
      lastError = err;
      const fault = isKeyFault(err);
      markFailure(key, err);
      // Don't retry on non-key faults — would just burn credits.
      if (!fault) break;
    }
  }

  if (lastError instanceof KieError) throw lastError;
  if (lastError instanceof Error) throw lastError;
  throw new Error("All keys failed");
}

export function maskKey(key: string): string {
  if (key.length < 12) return "***";
  return `${key.slice(0, 6)}…${key.slice(-4)}`;
}
