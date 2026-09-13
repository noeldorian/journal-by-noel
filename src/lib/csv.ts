import type { Trade } from "./types";
import { computeTradeMetrics } from "./calculations";

export function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r\n|\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  function parseLine(line: string): string[] {
    const cells: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (inQuotes) {
        if (char === '"' && line[i + 1] === '"') { current += '"'; i++; }
        else if (char === '"') { inQuotes = false; }
        else { current += char; }
      } else if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        cells.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    cells.push(current);
    return cells.map((c) => c.trim());
  }

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(parseLine);
  return { headers, rows };
}

export const IMPORT_FIELDS = [
  { key: "date", label: "Date", required: true },
  { key: "symbol", label: "Symbol / Instrument", required: true },
  { key: "direction", label: "Direction (Long/Short)", required: false },
  { key: "entry", label: "Entry Price", required: true },
  { key: "exit", label: "Exit Price", required: true },
  { key: "quantity", label: "Quantity / Contracts", required: true },
  { key: "pnl", label: "P&L (optional, recalculated if omitted)", required: false },
  { key: "fees", label: "Fees", required: false },
] as const;

export type ImportFieldKey = (typeof IMPORT_FIELDS)[number]["key"];
export type ColumnMapping = Partial<Record<ImportFieldKey, string>>;

export interface ImportRowResult {
  row: string[];
  trade?: Trade;
  errors: string[];
}

export function validateAndBuildTrades(
  headers: string[],
  rows: string[][],
  mapping: ColumnMapping,
  accountId: string,
  makeId: () => string
): ImportRowResult[] {
  const indexOf = (key: ImportFieldKey) => {
    const col = mapping[key];
    return col ? headers.indexOf(col) : -1;
  };

  return rows.map((row) => {
    const errors: string[] = [];
    const get = (key: ImportFieldKey) => {
      const idx = indexOf(key);
      return idx >= 0 ? row[idx] : undefined;
    };

    const dateRaw = get("date");
    const symbolRaw = get("symbol")?.toUpperCase();
    const entryRaw = get("entry");
    const exitRaw = get("exit");
    const qtyRaw = get("quantity");
    const feesRaw = get("fees");
    const directionRaw = get("direction")?.toLowerCase();

    if (!dateRaw) errors.push("Missing date");
    if (!symbolRaw) errors.push("Missing symbol");
    const entry = Number(entryRaw);
    const exit = Number(exitRaw);
    const qty = Number(qtyRaw);
    if (!entryRaw || Number.isNaN(entry)) errors.push("Invalid entry price");
    if (!exitRaw || Number.isNaN(exit)) errors.push("Invalid exit price");
    if (!qtyRaw || Number.isNaN(qty) || qty <= 0) errors.push("Invalid quantity");

    let normalizedDate = dateRaw ?? "";
    if (dateRaw && /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(dateRaw)) {
      const [m, d, y] = dateRaw.split("/");
      const year = y.length === 2 ? `20${y}` : y;
      normalizedDate = `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }

    const direction = directionRaw?.startsWith("s") ? "Short" : "Long";

    if (errors.length > 0) {
      return { row, errors };
    }

    const now = new Date().toISOString();
    const trade: Trade = {
      id: makeId(),
      accountId,
      date: normalizedDate,
      entryTime: "09:30",
      exitTime: "10:00",
      instrument: (symbolRaw as Trade["instrument"]) ?? "NQ",
      direction,
      session: "New York",
      entryPrice: entry,
      exitPrice: exit,
      stopLoss: direction === "Long" ? entry - Math.abs(entry - exit || 1) : entry + Math.abs(entry - exit || 1),
      takeProfit: exit,
      contracts: qty,
      fees: feesRaw ? Number(feesRaw) || 0 : 0,
      slippage: 0,
      tags: ["Imported"],
      psychTags: [],
      notes: {},
      screenshots: [],
      createdAt: now,
      updatedAt: now,
    };

    return { row, trade, errors: [] };
  });
}

export function tradesToCsv(trades: Trade[]): string {
  const headers = [
    "Date", "Entry Time", "Exit Time", "Instrument", "Direction", "Entry", "Stop Loss",
    "Take Profit", "Exit", "Contracts", "Commissions", "Fees", "P&L", "Net P&L", "R Multiple",
    "Setup", "Session", "Result", "Tags",
  ];
  const lines = [headers.join(",")];
  for (const t of trades) {
    const m = computeTradeMetrics(t);
    const cells = [
      t.date, t.entryTime, t.exitTime, t.instrument, t.direction,
      t.entryPrice ?? "", t.stopLoss ?? "", t.takeProfit ?? "", t.exitPrice ?? "",
      t.contracts, t.fees, t.slippage,
      m.grossPnl.toFixed(2), m.netPnl.toFixed(2), m.rMultiple.toFixed(2),
      t.setup ?? "", t.session, m.result, `"${t.tags.join("; ")}"`,
    ];
    lines.push(cells.join(","));
  }
  return lines.join("\n");
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
