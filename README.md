# Inkwell Studio

A self-hosted AI image studio that runs in the browser. Generate, edit, animate, and chat with a model that pulls pictures into the conversation when they help.

Deploy it once on Vercel and you have your own image studio available 24/7 from any device — phone, laptop, tablet — at the same URL. No installs, no servers to maintain. Free tier handles it for personal use.

Built with Next.js 15, Tailwind, and Framer Motion. Mobile-first UI, full desktop layout on wider screens.

---

## What you get

**Studio** — type a prompt, get up to 4 images per request. Batch size and aspect ratio configurable.

**Chat with images** — talk to a model that can generate or edit pictures inline. Drop or paste an image, ask "remove the cat", and it edits what you sent. Conversation history is stored locally per device.

**Image editor** — open any generation in a full-screen viewer, type a description of the change, swipe between versions, animate into a short video, or download.

**Standalone editor** — upload an image from disk and edit it the same way.

**Vault** — every picture you generate is kept locally so you can come back to it later.

---

## Deploy on Vercel — 5 minutes, free, anywhere

This is the recommended way. Once it's up you get a permanent URL like `your-studio.vercel.app` that works from any device, any network, 24/7. Free tier is enough for personal use.

### 1. Get the API keys

You need two things:

**kie.ai** (for image generation, editing, and video)

- Sign up at [kie.ai](https://kie.ai) — comes with free starter credits.
- Open the dashboard, copy your API key.
- Top up later if you run out, or add more keys through the app's UI.

**OpenRouter** (for the chat page — optional, only if you want chat)

- Sign up at [openrouter.ai](https://openrouter.ai), create a key at [openrouter.ai/keys](https://openrouter.ai/keys).
- The default chat model `openrouter/owl-alpha` runs through OpenRouter. If you hit a daily cap, swap to any other model in **Settings → Models**.
- If chat returns `402 Payment Required`, you've hit a free-tier limit — adding ≥$10 of credits to OpenRouter usually lifts it.

### 2. Push the repo to GitHub

```bash
git clone <this repo>
cd inkwell-studio
git remote set-url origin https://github.com/<you>/inkwell-studio.git
git push -u origin main
```

(Or just fork it on GitHub.)

### 3. Import on Vercel

- Go to [vercel.com/new](https://vercel.com/new) and pick the repo.
- Vercel auto-detects Next.js. Don't change build settings.
- Add these environment variables before deploying:

| Variable | Required | What it is |
|---|---|---|
| `KIE_API_KEYS` | yes | Your kie.ai key(s). Comma or newline separated if more than one. |
| `OPENROUTER_API_KEY` | only for chat | One OpenRouter key. |
| `SITE_PASSWORD` | optional | If set, the whole site requires this password to access. Recommended if you don't want strangers using your URL. |
| `NEXT_PUBLIC_SITE_URL` | optional | Your prod URL, e.g. `https://your-studio.vercel.app`. Used as `HTTP-Referer` for OpenRouter analytics. |

- Click **Deploy**. First build takes ~1 minute.

### 4. Open the URL on every device you own

Bookmark `your-studio.vercel.app` on your phone home screen, on your laptop, wherever. Same URL, same chat history per device (local storage), shared kie.ai credits since they live on the server.

### Vercel free tier — what you should know

- Free tier function execution caps at **60 seconds**. Image generation fits comfortably (~10–30s). Video generation can take up to 3 minutes — on Hobby that means video tasks **will time out**. Either stay on Hobby and skip video, or open `app/api/video/route.ts` and lower `maxDuration` to `60` so the timeout is graceful.
- Free tier has 100 GB-hours/month of function time, more than enough for personal use.
- Free tier gets a `*.vercel.app` subdomain. Custom domains are free, you bring the domain.

`vercel.json` is already set up with sensible per-route timeouts on Pro (120s for image, 300s for video).

---

## Adding kie.ai keys after deploy

You can add or remove keys without redeploying:

- Open the live URL.
- Tap the gear icon (or the sidebar Settings on desktop).
- Go to the **Keys** tab.
- Paste your keys — one per line, or comma-separated. The "Test all" button checks each one and shows the credit balance.

Server-side keys from `KIE_API_KEYS` and UI-pasted keys are merged on every request. The app rotates through them automatically: rate-limited, out-of-credits, or invalid keys are skipped, and the response shows you which key actually handled the request.

---

## Run locally (alternative to Vercel)

If you prefer running on your own machine:

```bash
git clone <this repo>
cd inkwell-studio
cp .env.example .env.local
# fill in KIE_API_KEYS and optionally OPENROUTER_API_KEY
pnpm install
pnpm dev
```

Open [localhost:3000](http://localhost:3000). Same env vars as on Vercel. Locally you don't need Vercel timeouts — video tasks run as long as kie.ai needs.

---

## How chat understands images

When you talk to the model, the server pre-builds a catalog of every picture in the conversation (ones you attached, ones the model generated earlier) and assigns each a short id like `img1`, `img2`. The model references those ids when it wants to edit something:

```
remove the cat from img2 and make the background a beach
```

The server resolves the id back to a URL, sends it to kie.ai's image-to-image endpoint, and streams the result into the chat. You don't deal with ids yourself — you just say "make it black and white" and the right image gets edited.

---

## Keyboard and gestures

- **Paste** an image anywhere in chat — it attaches.
- **Drag and drop** image files onto the chat — same.
- **Swipe** left / right on the full-screen viewer to flip between versions.
- **Click any picture** in chat to open the viewer.

---

## Stack

| | |
|---|---|
| Framework | Next.js 15 (App Router) |
| Styling | Tailwind CSS 3 |
| Animation | Framer Motion |
| Markdown | react-markdown + remark-gfm |
| Image API | [kie.ai](https://kie.ai) Grok Imagine |
| Chat API | [OpenRouter](https://openrouter.ai) |
| Storage | localStorage — no database needed |

Everything client-side stays in the browser. Outbound traffic only goes to kie.ai and (optionally) OpenRouter.

---

