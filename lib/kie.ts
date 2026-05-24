/**
 * Thin wrapper around the kie.ai REST API. The router is responsible for
 * picking a key from the pool and rotating on auth/quota failures.
 */

const KIE_API = "https://api.kie.ai";
const KIE_FILE_API = "https://kieai.redpandaai.co";

export class KieError extends Error {
  status: number;
  code: number;
  body: unknown;
  constructor(message: string, status: number, code: number, body: unknown) {
    super(message);
    this.name = "KieError";
    this.status = status;
    this.code = code;
    this.body = body;
  }
}

function authHeaders(key: string) {
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

async function readJson(res: Response): Promise<{
  code?: number;
  msg?: string;
  data?: unknown;
  success?: boolean;
}> {
  try {
    return (await res.json()) as { code?: number; msg?: string; data?: unknown };
  } catch {
    return {};
  }
}

function unwrap<T>(json: { code?: number; msg?: string; data?: T }, status: number): T {
  if (json.code !== 200) {
    throw new KieError(json.msg || `kie.ai error (${json.code})`, status, json.code ?? 0, json);
  }
  return json.data as T;
}

export async function getCredits(key: string): Promise<number> {
  const res = await fetch(`${KIE_API}/api/v1/chat/credit`, { headers: authHeaders(key) });
  const json = await readJson(res);
  return unwrap<number>(json as { data: number }, res.status);
}

export type UploadedFile = { downloadUrl: string; fileName: string; mimeType: string };

/** Returns a public, 24h-valid CDN URL suitable for Grok Imagine `image_urls`. */
export async function uploadBase64(
  key: string,
  base64Data: string,
  fileName?: string
): Promise<UploadedFile> {
  const res = await fetch(`${KIE_FILE_API}/api/file-base64-upload`, {
    method: "POST",
    headers: authHeaders(key),
    body: JSON.stringify({
      base64Data,
      uploadPath: "neural-studio",
      fileName,
    }),
  });
  const json = await readJson(res);
  if (json.code !== 200 || !json.success) {
    throw new KieError(
      json.msg || `Upload failed (${json.code})`,
      res.status,
      json.code ?? 0,
      json
    );
  }
  return json.data as UploadedFile;
}

export type TaskInput = Record<string, unknown>;

export async function createTask(
  key: string,
  model: string,
  input: TaskInput
): Promise<{ taskId: string }> {
  const res = await fetch(`${KIE_API}/api/v1/jobs/createTask`, {
    method: "POST",
    headers: authHeaders(key),
    body: JSON.stringify({ model, input }),
  });
  const json = await readJson(res);
  return unwrap<{ taskId: string }>(json as { data: { taskId: string } }, res.status);
}

export type TaskState = "waiting" | "queuing" | "generating" | "success" | "fail";
export type TaskRecord = {
  state: TaskState;
  resultJson?: string;
  failCode?: number;
  failMsg?: string;
  taskId?: string;
};

export async function pollTask(
  key: string,
  taskId: string,
  opts: {
    intervalMs?: number;
    timeoutMs?: number;
    onStatus?: (record: TaskRecord) => void;
  } = {}
): Promise<string[]> {
  const interval = opts.intervalMs ?? 2500;
  const timeout = opts.timeoutMs ?? 110_000;
  const start = Date.now();
  let delay = interval;

  while (Date.now() - start < timeout) {
    const res = await fetch(
      `${KIE_API}/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`,
      { headers: authHeaders(key) }
    );
    const json = await readJson(res);
    if (json.code !== 200) {
      throw new KieError(json.msg || "poll failed", res.status, json.code ?? 0, json);
    }
    const record = json.data as TaskRecord;
    opts.onStatus?.(record);

    if (record.state === "success") return parseResultUrls(record.resultJson);
    if (record.state === "fail") {
      throw new KieError(
        record.failMsg || "Task failed",
        500,
        record.failCode ?? 0,
        record
      );
    }

    await new Promise((r) => setTimeout(r, delay));
    if (Date.now() - start > 30_000) delay = Math.min(delay + 1000, 8000);
  }

  throw new KieError("Polling timed out", 504, 0, { taskId });
}

function parseResultUrls(resultJson?: string): string[] {
  if (!resultJson) return [];
  try {
    const parsed = JSON.parse(resultJson) as {
      resultUrls?: string[];
      result_urls?: string[];
      images?: string[];
      videos?: string[];
    };
    return (
      parsed.resultUrls ||
      parsed.result_urls ||
      parsed.images ||
      parsed.videos ||
      []
    );
  } catch {
    return [resultJson];
  }
}

/** Was this error caused by an exhausted/invalid/blocked key? */
export function isKeyFault(err: unknown): "auth" | "quota" | "rate" | null {
  if (!(err instanceof KieError)) return null;
  if (err.status === 401 || err.status === 403) return "auth";
  if (err.status === 429) return "rate";
  const m = (err.message || "").toLowerCase();
  if (m.includes("credit") || m.includes("balance") || m.includes("insufficient")) return "quota";
  if (m.includes("rate") || m.includes("too many")) return "rate";
  return null;
}
