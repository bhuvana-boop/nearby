# Nearby: care boards for parents who live far away

Children who live in another city, state or country can send their own Claude a photo of a prescription or discharge summary. Nearby turns it into a **live care board**:

- the **helper at home** (nurse, neighbour or the parent) ticks medicines off through a no-login link on their phone
- **every sibling** sees the same record, live
- **appointments flow into everyone's calendar** through a subscription feed
- days later, the family asks Claude *"How's Amma doing?"* and Claude reads what actually happened at home

**Nearby has no AI inside.** It holds no AI keys and makes no model calls. The customer's own Claude does the reading and writing over MCP. Nearby does the saving, sharing and editing, and keeps the record live after the chat ends.

## Try it

| | |
|---|---|
| Live app | `https://nearby-care-omega.vercel.app` |
| Demo login | `demo@nearby.care` / `nearby-demo` |
| Demo MCP link | `https://nearby-care-omega.vercel.app/api/mcp/demo-menon-k7m2q` |
| Helper view (no login) | `https://nearby-care-omega.vercel.app/h/demo-amma` |
| Sample document | `https://nearby-care-omega.vercel.app/demo/discharge-summary.png` (fictional) |

**Connect to Claude:** claude.ai → Settings → Connectors → *Add custom connector* → name `Nearby`, paste the MCP link → Add. In a chat, turn Nearby on from the tools menu, attach the sample discharge summary and say *"My father Gopinath was discharged yesterday. Set up his care board."*

## MCP tools

| Tool | What it does |
|---|---|
| `list_parents` | Parents on the account, with ids, board links and helper links |
| `save_parent` | Create or update a parent profile; creates the no-login helper link |
| `add_care_plan` | Save medicines (times, including Indian `1-0-1` notation), appointments and tasks extracted from documents |
| `update_item` | Reschedule, change a dose, reassign, mark done, stop or delete |
| `get_status` | Doses given, skipped or unmarked; readings and notes from home; overdue and upcoming items; the active plan with ids |

Transport: MCP Streamable HTTP, stateless, JSON responses, at `POST /api/mcp/<family-key>`. Each family gets a private key in its URL, so it works as a Claude custom connector with no OAuth. It also works with Claude Desktop, Claude Code (`claude mcp add --transport http nearby <url>`) and ChatGPT developer mode.

## Stack (₹0 to run)

- Next.js 16 (App Router, server actions) on **Vercel Hobby**
- **Neon Postgres** free tier in production. Locally it falls back to PGlite (embedded Postgres), so `npm run dev` works with zero setup.
- No AI SDKs, no AI keys. Dependencies: `next`, `react`, `@neondatabase/serverless`, `@electric-sql/pglite`.

```
app/
  api/mcp/[key]/route.ts   MCP endpoint (JSON-RPC over HTTP)
  api/cal/[token]/route.ts iCalendar feed for the family
  app/                     family dashboard + parent care board (login)
  h/[token]/               helper checklist (no login, mobile-first)
  connect/                 how to connect Claude / ChatGPT
lib/
  care.ts                  domain logic shared by Claude tools and the UI
  mcp.ts                   tool definitions + JSON-RPC handler
  time.ts                  timezone + prescription-time parsing (1-0-1, "after dinner", 8pm)
  seed.ts                  demo family (fictional)
scripts/test-mcp.mjs       end-to-end test with the official MCP SDK client
```

## Run locally

```bash
npm install
npm run dev            # http://localhost:3000, uses a local PGlite database in .data/
npm run test:mcp       # exercises every tool with the official MCP client
```

## Deploy (free)

1. `npx vercel login`, then `npx vercel --prod` from this folder (or push to GitHub and import it in Vercel).
2. In the Vercel project: **Storage → Create Database → Neon (free)** → connect it to the project. This sets `DATABASE_URL`.
3. Redeploy: `npx vercel --prod`. Tables and the demo family are created on the first request.

Optional env vars: `APP_URL` (public URL, auto-detected), `SESSION_SECRET` (derived from `DATABASE_URL` if not set).

*Nearby is a care-coordination tool, not medical advice.*
