// End-to-end check of the MCP endpoint using the official MCP SDK client (same protocol Claude uses).
// Usage: node scripts/test-mcp.mjs [mcpUrl]
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const url = process.argv[2] || "http://localhost:3000/api/mcp/demo-menon-k7m2q";
const client = new Client({ name: "nearby-test", version: "1.0.0" });
await client.connect(new StreamableHTTPClientTransport(new URL(url)));
console.log("Connected:", client.getServerVersion());

const { tools } = await client.listTools();
console.log("Tools:", tools.map((t) => t.name).join(", "));

const call = async (name, args = {}) => {
  const r = await client.callTool({ name, arguments: args });
  console.log(`\n=== ${name} ${r.isError ? "(ERROR)" : ""}\n${r.content[0].text}`);
  return r;
};

await call("list_parents");
const saved = await call("save_parent", {
  name: "Gopinath Nair",
  relation: "Achan",
  age: 74,
  city: "Kozhikode, Kerala",
  conditions: "Post angioplasty, hypertension",
  helper_name: "Rajan (neighbour)",
});
const pid = saved.structuredContent.parent_id;
const plan = await call("add_care_plan", {
  parent_id: pid,
  source_note: "Discharge summary, test",
  medicines: [
    { name: "Clopidogrel", dose: "75 mg", times: ["0-0-1"], instructions: "After dinner" },
    { name: "Aspirin", dose: "75 mg", times: ["1-0-0"] },
    { name: "Pantoprazole", dose: "40 mg", times: ["7:30 am"], instructions: "Empty stomach", duration_days: 30 },
    { name: "Nitroglycerin", dose: "0.5 mg", times: [], instructions: "SOS chest pain" },
  ],
  appointments: [
    { title: "Cardiology review", date: "2026-11-20", time: "11:00", doctor: "Dr. A. Kumar", place: "Test Hospital" },
    { title: "Echo test", prep: "No prep" },
  ],
  tasks: [{ title: "Lipid profile", due_date: "2026-11-18", assignee: "Rajan (neighbour)" }],
});
const firstMed = plan.structuredContent.added.medicines[0];
await call("update_item", { item_id: firstMed, times: ["21:30"], dose: "75 mg · 1 tablet" });
await call("get_status", { parent_id: "p_amma01" });
await call("update_item", { item_id: "nope" });
await client.close();
