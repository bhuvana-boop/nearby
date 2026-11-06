import { NextRequest } from "next/server";
import { familyByMcpKey } from "@/lib/care";
import { handleRpc } from "@/lib/mcp";
import { baseUrlFrom } from "@/lib/ids";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization, Mcp-Session-Id, Mcp-Protocol-Version, Last-Event-ID",
  "Access-Control-Expose-Headers": "Mcp-Session-Id",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...CORS } });

export async function POST(req: NextRequest, ctx: { params: Promise<{ key: string }> }) {
  const { key } = await ctx.params;
  const family = await familyByMcpKey(key);
  if (!family) return json({ jsonrpc: "2.0", id: null, error: { code: -32001, message: "Unknown Nearby connector link. Copy it again from your Nearby dashboard." } }, 404);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, 400);
  }
  const base = baseUrlFrom(req.headers);
  if (Array.isArray(body)) {
    const out = (await Promise.all(body.map((m) => handleRpc(family, base, m)))).filter(Boolean);
    return out.length ? json(out) : new Response(null, { status: 202, headers: CORS });
  }
  const res = await handleRpc(family, base, body as any);
  return res ? json(res) : new Response(null, { status: 202, headers: CORS });
}

// Stateless server: no server-initiated SSE stream and no sessions to delete.
export async function GET() {
  return new Response("Nearby MCP endpoint. Add this URL to Claude as a custom connector.", {
    status: 405,
    headers: { Allow: "POST", "Content-Type": "text/plain", ...CORS },
  });
}
export async function DELETE() {
  return new Response(null, { status: 405, headers: { Allow: "POST", ...CORS } });
}
export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}
