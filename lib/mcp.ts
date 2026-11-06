// Nearby's MCP server: a small, stateless implementation of the MCP Streamable HTTP transport
// (JSON-RPC 2.0 over POST, JSON responses). No AI here - Claude calls these tools, the app stores and serves the result.
import { addCarePlan, getItems, listParents, parentLabel, saveParent, statusReport, updateItem } from "./care";
import { fmtTime, localParts, safeTz } from "./time";
import type { Row } from "./db";

const ACTOR = "Claude";

const medicineSchema = {
  type: "object",
  properties: {
    name: { type: "string", description: "Medicine name as written, e.g. 'Metformin' or brand 'Glycomet'." },
    dose: { type: "string", description: "Strength and quantity, e.g. '500 mg · 1 tablet'." },
    times: {
      type: "array",
      items: { type: "string" },
      description:
        "Daily times in 24h HH:MM, e.g. ['08:00','20:00']. Indian notation 1-0-1 means morning-afternoon-night = ['08:00','21:00']; 1-1-1 = ['08:00','13:00','21:00']; 0-0-1 = ['21:00']. Use [] for SOS / as-needed.",
    },
    instructions: { type: "string", description: "e.g. 'After food', 'Empty stomach', 'Do not crush'." },
    purpose: { type: "string", description: "What it is for, only if stated or obvious (e.g. 'Blood pressure')." },
    start_date: { type: "string", description: "YYYY-MM-DD. Defaults to today." },
    duration_days: { type: "integer", description: "Course length in days if limited (e.g. antibiotics 5 days). Omit for ongoing medicines." },
    end_date: { type: "string", description: "YYYY-MM-DD, alternative to duration_days." },
  },
  required: ["name"],
};

const TOOLS = [
  {
    name: "list_parents",
    title: "List parents",
    description: "List the parents (or other elders) this family cares for, with their ids, care board links and helper links. Call this first to find a parent_id.",
    inputSchema: { type: "object", properties: {} },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: "save_parent",
    title: "Create or update a parent",
    description:
      "Create a care board for a parent/elder, or update their profile if parent_id is given. Each parent gets a no-login helper link for whoever is with them (home nurse, neighbour, the parent themself).",
    inputSchema: {
      type: "object",
      properties: {
        parent_id: { type: "string", description: "Only when updating an existing parent." },
        name: { type: "string", description: "Full name, e.g. 'Lakshmi Menon'." },
        relation: { type: "string", description: "What the family calls them: 'Amma', 'Achan', 'Papa', 'Dadi', 'Mom'." },
        age: { type: "integer" },
        city: { type: "string", description: "Where the parent lives, e.g. 'Thrissur, Kerala'." },
        conditions: { type: "string", description: "Known conditions, comma separated." },
        helper_name: { type: "string", description: "Person on the ground who will use the helper link, e.g. 'Sindhu (home nurse)'." },
        helper_phone: { type: "string", description: "Helper's WhatsApp number with country code, for sharing the link." },
        timezone: { type: "string", description: "IANA timezone of the parent. Default Asia/Kolkata." },
        notes: { type: "string" },
      },
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  {
    name: "add_care_plan",
    title: "Add medicines, appointments and tasks",
    description:
      "Save a care plan to a parent's live board - typically extracted from a prescription, discharge summary or lab report the user shared, or from what the user says. " +
      "Record only what the document or user states; never invent doses or dates. If something is unclear (handwriting, missing timing), still add it and mention it in your reply so the family can fix it in the app. " +
      "Follow-ups like 'review after 2 weeks' become appointments with a computed date; tests to do before a visit become tasks. The helper sees medicines on their checklist immediately and appointments appear in the family calendar feed.",
    inputSchema: {
      type: "object",
      properties: {
        parent_id: { type: "string" },
        source_note: { type: "string", description: "Short description of the source, e.g. 'Discharge summary, Sahya Hospital, 3 Nov 2026'." },
        medicines: { type: "array", items: medicineSchema },
        appointments: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string", description: "e.g. 'Cardiology follow-up'." },
              date: { type: "string", description: "YYYY-MM-DD. Compute from 'review after 10 days' using the document date." },
              time: { type: "string", description: "HH:MM 24h if known." },
              doctor: { type: "string" },
              place: { type: "string", description: "Hospital / clinic and city." },
              prep: { type: "string", description: "Preparation: fasting, reports to carry, etc." },
              assignee: { type: "string", description: "Who will take them, if known." },
            },
            required: ["title"],
          },
        },
        tasks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string", description: "e.g. 'Fasting blood sugar test', 'Buy glucometer strips'." },
              due_date: { type: "string", description: "YYYY-MM-DD if there is a deadline." },
              assignee: { type: "string" },
              notes: { type: "string" },
            },
            required: ["title"],
          },
        },
      },
      required: ["parent_id"],
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  {
    name: "update_item",
    title: "Update a medicine, appointment or task",
    description:
      "Change one item on the board: reschedule an appointment, change a dose or times, reassign a task, mark it done, stop a medicine (status 'stopped') or remove a mistake (status 'deleted'). Get item ids from get_status.",
    inputSchema: {
      type: "object",
      properties: {
        item_id: { type: "string" },
        status: { type: "string", enum: ["active", "done", "stopped", "deleted"] },
        title: { type: "string" },
        dose: { type: "string" },
        times: { type: "array", items: { type: "string" }, description: "Medicines: new daily times, HH:MM." },
        instructions: { type: "string" },
        date: { type: "string", description: "Appointments/tasks: new date YYYY-MM-DD." },
        time: { type: "string", description: "Appointments: new time HH:MM." },
        doctor: { type: "string" },
        place: { type: "string" },
        assignee: { type: "string" },
        end_date: { type: "string", description: "Medicines: last day YYYY-MM-DD." },
      },
      required: ["item_id"],
    },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "get_status",
    title: "How are they doing?",
    description:
      "Read what has happened since the chat ended: doses the helper marked given/skipped or left unmarked, notes and readings (BP, sugar) from home, upcoming and overdue appointments/tasks, and the active plan with item ids. Use it to answer 'How is Amma this week?' or 'Anything overdue?'. Summarise for the family; flag worrying patterns gently and suggest they check with the doctor rather than giving medical advice.",
    inputSchema: {
      type: "object",
      properties: {
        parent_id: { type: "string", description: "Omit for all parents." },
        days: { type: "integer", description: "Look-back window, default 7, max 30." },
      },
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
];

const INSTRUCTIONS = `Nearby keeps a live care board for a family's ageing parents who live far from their children.
Claude does the reading and writing; Nearby stores it, gives the helper at home a no-login checklist link, feeds appointments into the family's calendar, and records what actually happened.
Typical flow: user shares a prescription / discharge summary photo -> call list_parents -> save_parent if new -> add_care_plan with everything extracted -> reply with a short summary, anything unclear, and the board + helper links.
Later: "How is Amma doing?" -> get_status -> summarise. Never give medical advice beyond what the documents say; recommend checking with the doctor for anything concerning.`;

type Rpc = { jsonrpc?: string; id?: string | number | null; method?: string; params?: Record<string, any> };

function textResult(text: string, structured?: unknown, isError = false) {
  const r: Record<string, unknown> = { content: [{ type: "text", text }] };
  if (structured !== undefined) r.structuredContent = structured;
  if (isError) r.isError = true;
  return r;
}

function boardLinks(base: string, p: Row) {
  return { board_url: `${base}/app/p/${p.id}`, helper_url: `${base}/h/${p.helper_token}` };
}

async function callTool(family: Row, base: string, name: string, args: Record<string, any>) {
  switch (name) {
    case "list_parents": {
      const parents = await listParents(family.id);
      if (!parents.length) return textResult("No parents yet. Create one with save_parent.", { parents: [] });
      const lines: string[] = [];
      const data = [];
      for (const p of parents) {
        const items = await getItems(p.id);
        const active = items.filter((i) => i.status === "active");
        const counts = {
          medicines: active.filter((i) => i.kind === "medicine").length,
          appointments: active.filter((i) => i.kind === "appointment").length,
          tasks: active.filter((i) => i.kind === "task").length,
        };
        const links = boardLinks(base, p);
        lines.push(
          `- ${parentLabel(p)} [parent_id: ${p.id}]${p.age ? `, ${p.age}` : ""}${p.city ? `, ${p.city}` : ""}. ${counts.medicines} medicines, ${counts.appointments} appointments, ${counts.tasks} open tasks. Helper: ${p.helper_name || "not set"}. Board: ${links.board_url}`
        );
        data.push({ parent_id: p.id, name: p.name, relation: p.relation, city: p.city, ...counts, ...links });
      }
      return textResult(`${family.name} - ${parents.length} parent(s):\n${lines.join("\n")}`, { parents: data });
    }
    case "save_parent": {
      const p = await saveParent(family.id, args, ACTOR);
      const links = boardLinks(base, p);
      const verb = args.parent_id ? "Updated" : "Created care board for";
      return textResult(
        `${verb} ${parentLabel(p)} [parent_id: ${p.id}].\nCare board (family): ${links.board_url}\nHelper link (no login - send to ${p.helper_name || "whoever is with them"} on WhatsApp): ${links.helper_url}`,
        { parent_id: p.id, ...links }
      );
    }
    case "add_care_plan": {
      if (!args.parent_id) return textResult("parent_id is required. Call list_parents or save_parent first.", undefined, true);
      const { parent, added, warnings } = await addCarePlan(family.id, String(args.parent_id), args, ACTOR);
      const L: string[] = [`Saved to ${parentLabel(parent)}'s board:`];
      for (const m of added.medicines)
        L.push(`- [${m.id}] ${m.title}${m.dose ? ` ${m.dose}` : ""} - ${m.times ? m.times.split(",").map(fmtTime).join(", ") : "as needed"}${m.instructions ? `, ${m.instructions}` : ""}${m.end_date ? ` until ${m.end_date}` : ""}`);
      for (const a of added.appointments) L.push(`- [${a.id}] Appointment: ${a.title} on ${a.due_date}${a.due_time ? ` ${fmtTime(a.due_time)}` : ""}${a.place ? ` at ${a.place}` : ""}`);
      for (const t of added.tasks) L.push(`- [${t.id}] Task: ${t.title}${t.due_date ? ` by ${t.due_date}` : ""}${t.assignee ? ` (${t.assignee})` : ""}`);
      if (warnings.length) L.push(`\nPlease confirm with the family:\n${warnings.map((w) => `- ${w}`).join("\n")}`);
      const links = boardLinks(base, parent);
      L.push(`\nLive board: ${links.board_url}\nHelper checklist: ${links.helper_url}\nAppointments now appear in the family calendar feed.`);
      return textResult(L.join("\n"), {
        parent_id: parent.id,
        added: { medicines: added.medicines.map((i) => i.id), appointments: added.appointments.map((i) => i.id), tasks: added.tasks.map((i) => i.id) },
        warnings,
        ...links,
      });
    }
    case "update_item": {
      if (!args.item_id) return textResult("item_id is required.", undefined, true);
      const it = await updateItem(family.id, String(args.item_id), args, ACTOR);
      return textResult(
        `Updated [${it.id}] ${it.title}: status ${it.status}${it.due_date ? `, ${it.due_date}${it.due_time ? ` ${it.due_time}` : ""}` : ""}${it.times ? `, times ${it.times}` : ""}${it.dose ? `, dose ${it.dose}` : ""}.`,
        { item: { id: it.id, kind: it.kind, title: it.title, status: it.status, due_date: it.due_date, due_time: it.due_time, times: it.times, dose: it.dose } }
      );
    }
    case "get_status": {
      const days = Math.min(Math.max(parseInt(String(args.days ?? 7), 10) || 7, 1), 30);
      const r = await statusReport(family.id, base, args.parent_id ? String(args.parent_id) : undefined, days);
      return textResult(r.text, { parents: r.data });
    }
    default:
      return null;
  }
}

export async function handleRpc(family: Row, base: string, msg: Rpc): Promise<Record<string, unknown> | null> {
  const id = msg.id;
  const isNotification = id === undefined || id === null;
  const reply = (result: unknown) => ({ jsonrpc: "2.0", id, result });
  const fail = (code: number, message: string) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });

  if (!msg || typeof msg.method !== "string") return isNotification ? null : fail(-32600, "Invalid request");
  if (isNotification) return null; // notifications/initialized etc.

  switch (msg.method) {
    case "initialize": {
      const requested = msg.params?.protocolVersion;
      return reply({
        protocolVersion: typeof requested === "string" && /^\d{4}-\d{2}-\d{2}$/.test(requested) ? requested : "2025-06-18",
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "nearby", title: "Nearby - care boards for parents far away", version: "1.0.0" },
        instructions: `${INSTRUCTIONS}\nConnected family: ${family.name}. Today in India: ${localParts(safeTz("Asia/Kolkata")).date}.`,
      });
    }
    case "ping":
      return reply({});
    case "tools/list":
      return reply({ tools: TOOLS });
    case "resources/list":
      return reply({ resources: [] });
    case "resources/templates/list":
      return reply({ resourceTemplates: [] });
    case "prompts/list":
      return reply({ prompts: [] });
    case "tools/call": {
      const name = String(msg.params?.name ?? "");
      const args = (msg.params?.arguments ?? {}) as Record<string, any>;
      try {
        const res = await callTool(family, base, name, args);
        if (!res) return fail(-32602, `Unknown tool: ${name}`);
        return reply(res);
      } catch (e) {
        return reply(textResult(`Error: ${(e as Error).message}`, undefined, true));
      }
    }
    default:
      return fail(-32601, `Method not found: ${msg.method}`);
  }
}
