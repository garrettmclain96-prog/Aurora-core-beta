// Aurora Core — NL → Command mapping layer.
// Conservative: never executes anything destructive without an explicit command.

import { aurora } from "./aurora";

export interface Command {
  kind:  string;
  args?: Record<string, string>;
}

// ── Parser ────────────────────────────────────────────────────────────────────

export function parse(input: string): Command {
  const t     = input.trim();
  const lower = t.toLowerCase();

  // Slash commands take priority
  if (t.startsWith("/")) {
    const [cmd, ...rest] = t.slice(1).split(/\s+/);
    const args: Record<string, string> = {};
    for (const part of rest) {
      const [k, ...vs] = part.split("=");
      if (k && vs.length) args[k] = vs.join("=");
    }
    return { kind: cmd!.toLowerCase(), args };
  }

  // NLP → command mapping
  // Score / status
  if (/(how.*doing|what.*score|system.*score|status|overview|summary)/.test(lower))
    return { kind: "show", args: { what: "score" } };

  // Insights / recommendations
  if (/(insight|recommend|suggest|warn|alert|signal|issue|problem|flag)/.test(lower))
    return { kind: "show", args: { what: "insights" } };

  // Raw state
  if (/(state|reading|sensor|current|value|live|data)/.test(lower))
    return { kind: "show", args: { what: "state" } };

  // Mode switches
  if (/(sleep|night|rest|recover|wind.?down|bedtime|calm)/.test(lower))
    return { kind: "set", args: { mode: "health_sentinel" } };
  if (/(energy|power|solar|cheap|tariff|cost|save|peak|grid)/.test(lower))
    return { kind: "set", args: { mode: "energy_guardian" } };
  if (/(comfort|balance|home|habitat|environment|air|temp)/.test(lower))
    return { kind: "set", args: { mode: "habitat_optimizer" } };

  // Devices
  if (/(device|turnbot|light|hvac|valve|fan|purifier|dim|turn off|turn on|ventilat)/.test(lower))
    return { kind: "show", args: { what: "devices" } };

  // Modes list
  if (/(mode|modes)/.test(lower))
    return { kind: "show", args: { what: "modes" } };

  // History / trend
  if (/(history|trend|last|previous|recent)/.test(lower))
    return { kind: "show", args: { what: "history" } };

  // Export
  if (/(export|download|backup|config)/.test(lower))
    return { kind: "export" };

  // Help
  if (/(help|\?)/.test(lower))
    return { kind: "help" };

  // Default: show score
  return { kind: "show", args: { what: "score" } };
}

// ── Executor ──────────────────────────────────────────────────────────────────

export async function execute(cmd: Command): Promise<string> {
  // ── /help ──
  if (cmd.kind === "help") {
    return [
      "**Commands**",
      "• `/show score|insights|state|devices|modes|history`",
      "• `/set mode=energy_guardian|health_sentinel|habitat_optimizer`",
      "• `/export` — download current config as JSON",
      "",
      "**Natural language**",
      "• "How am I doing?" → score",
      "• "Any warnings?" → insights",
      "• "Optimize for sleep tonight" → health_sentinel mode",
      "• "Save energy" → energy_guardian mode",
      "• "What devices do I have?" → device list",
    ].join("\n");
  }

  // ── /show ──
  if (cmd.kind === "show") {
    const what = cmd.args?.what ?? "score";

    if (what === "score") {
      const i = await aurora.getInsights();
      const b = i.current.breakdown;
      const signals = i.current.signals ?? [];
      const top = signals.find((s: { severity: string }) => s.severity === "alert") ??
                  signals.find((s: { severity: string }) => s.severity === "warn");
      return [
        `**Score: ${i.current.score}/100** — mode: ${b.mode.replace(/_/g, " ")}`,
        `Energy **${b.energy}** · Bio **${b.biometric}** · Env **${b.environment}**`,
        top ? `\n⚠ ${top.message}${top.recommendation ? ` → ${top.recommendation}` : ""}` : "",
      ].filter(Boolean).join("\n");
    }

    if (what === "insights") {
      const i = await aurora.getInsights();
      const sigs: Array<{ severity: string; message: string; recommendation?: string }> = i.current.signals ?? [];
      if (!sigs.length) return "No active signals. All clear ✓";
      return sigs.map(s =>
        `• [**${s.severity}**] ${s.message}${s.recommendation ? `\n  → ${s.recommendation}` : ""}`
      ).join("\n");
    }

    if (what === "state") {
      const { state } = await aurora.getState();
      return "```json\n" + JSON.stringify(state, null, 2) + "\n```";
    }

    if (what === "devices") {
      const { devices } = await aurora.getDevices();
      if (!devices.length) return "No devices registered for this installation.";
      return devices.map((d: { label: string; kind: string; id: string; online: boolean }) =>
        `• **${d.label}** (${d.kind}) — ${d.online ? "🟢 online" : "🔴 offline"}\n  id: \`${d.id}\``
      ).join("\n");
    }

    if (what === "modes") {
      const m = await aurora.getModes();
      return [
        `**Active:** ${m.active.replace(/_/g, " ")}`,
        "",
        ...m.available.map((a: { id: string; label: string; focus: string }) =>
          `• **${a.label}** — ${a.focus}${a.id === m.active ? " ✓" : ""}`
        ),
      ].join("\n");
    }

    if (what === "history") {
      const i = await aurora.getInsights();
      const hist: Array<{ score: number; ts: string }> = i.history?.slice(0, 10) ?? [];
      if (!hist.length) return "No score history yet.";
      return ["**Recent scores:**", ...hist.map(h =>
        `• ${h.score}/100 — ${new Date(h.ts).toLocaleTimeString()}`
      )].join("\n");
    }
  }

  // ── /set ──
  if (cmd.kind === "set") {
    if (cmd.args?.mode) {
      const valid = ["energy_guardian", "health_sentinel", "habitat_optimizer"];
      const mode  = cmd.args.mode.toLowerCase().replace(/\s+/g, "_");
      if (!valid.includes(mode))
        return `Unknown mode: \`${mode}\`. Valid: ${valid.join(", ")}`;
      const r = await aurora.setMode(mode as "energy_guardian" | "health_sentinel" | "habitat_optimizer");
      return `Mode switched to **${r.mode.replace(/_/g, " ")}** ✓`;
    }
  }

  // ── /export ──
  if (cmd.kind === "export") {
    const [{ state }, insights, modes] = await Promise.all([
      aurora.getState(),
      aurora.getInsights(),
      aurora.getModes(),
    ]);
    const config = {
      exportedAt:  new Date().toISOString(),
      mode:        modes.active,
      score:       insights.current.score,
      breakdown:   insights.current.breakdown,
      state,
    };
    return "```json\n" + JSON.stringify(config, null, 2) + "\n```";
  }

  // ── /device ──
  if (cmd.kind === "device") {
    const id      = cmd.args?.id;
    const command = cmd.args?.command ?? cmd.args?.cmd;
    if (!id || !command) {
      return "Usage: `/device id=<device_id> command=<cmd> [reason=<reason>]`";
    }
    const r = await aurora.command(id, command, undefined, cmd.args?.reason);
    return `Command **${command}** sent to device \`${id}\` — action: \`${(r as { action: { id: string } }).action.id}\` ✓`;
  }

  return `Unknown command: \`${cmd.kind}\`. Type \`/help\` for options.`;
}
