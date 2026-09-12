"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Download, Upload, Search, X, BookText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/input";
import { Pill } from "@/components/ui/tabs";
import { TradeTable } from "@/components/trades/trade-table";
import { CsvImportModal } from "@/components/trades/csv-import-modal";
import { useAppStore } from "@/lib/store";
import { useUiStore } from "@/lib/ui-store";
import { useToast } from "@/components/ui/toast";
import { tradesToCsv, downloadCsv } from "@/lib/csv";
import { todayLocalDateStr } from "@/lib/utils";
import { INSTRUMENT_LIST } from "@/lib/instruments";
import type { Direction, Session } from "@/lib/types";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function JournalContent() {
  const router = useRouter();
  const params = useSearchParams();
  const trades = useAppStore((s) => s.trades);
  const accounts = useAppStore((s) => s.accounts);
  const strategies = useAppStore((s) => s.strategies);
  const activeAccountId = useAppStore((s) => s.activeAccountId);
  const deleteTrades = useAppStore((s) => s.deleteTrades);
  const openAddTrade = useUiStore((s) => s.openAddTrade);
  const { push } = useToast();

  const [accountFilter, setAccountFilter] = useState<string>("active");
  const [instrumentFilter, setInstrumentFilter] = useState<string>("all");
  const [directionFilter, setDirectionFilter] = useState<Direction | "all">("all");
  const [sessionFilter, setSessionFilter] = useState<Session | "all">("all");
  const [resultFilter, setResultFilter] = useState<"all" | "Win" | "Loss">("all");
  const [strategyFilter, setStrategyFilter] = useState<string>("all");
  const [dayFilter, setDayFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState<string | null>(params.get("tag"));
  const [search, setSearch] = useState("");
  const [importOpen, setImportOpen] = useState(params.get("import") === "1");

  const filtered = useMemo(() => {
    return trades.filter((t) => {
      if (accountFilter === "active" && t.accountId !== activeAccountId) return false;
      if (accountFilter !== "active" && accountFilter !== "all" && t.accountId !== accountFilter) return false;
      if (instrumentFilter !== "all" && t.instrument !== instrumentFilter) return false;
      if (directionFilter !== "all" && t.direction !== directionFilter) return false;
      if (sessionFilter !== "all" && t.session !== sessionFilter) return false;
      if (strategyFilter !== "all" && t.strategyId !== strategyFilter) return false;
      if (tagFilter && !t.tags.includes(tagFilter)) return false;
      if (dayFilter !== "all") {
        const day = DAY_NAMES[new Date(t.date + "T00:00:00").getDay()];
        if (day !== dayFilter) return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const haystack = `${t.instrument} ${t.setup ?? ""} ${t.tags.join(" ")} ${t.notes.preTradePlan ?? ""} ${t.notes.postTradeReview ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [trades, accountFilter, instrumentFilter, directionFilter, sessionFilter, strategyFilter, tagFilter, dayFilter, search, activeAccountId]);

  const resultFiltered = useMemo(() => {
    if (resultFilter === "all") return filtered;
    return filtered.filter((t) => {
      const dir = t.direction === "Long" ? 1 : -1;
      const pnl = dir * (t.exitPrice - t.entryPrice);
      return resultFilter === "Win" ? pnl > 0 : pnl < 0;
    });
  }, [filtered, resultFilter]);

  function handleExport() {
    downloadCsv(`journal-by-noel-trades-${todayLocalDateStr()}.csv`, tradesToCsv(resultFiltered));
    push({ title: "Export ready", tone: "success", description: `${resultFiltered.length} trades exported to CSV.` });
  }

  function handleBulkDelete(ids: string[]) {
    deleteTrades(ids);
    push({ title: `Deleted ${ids.length} trade${ids.length > 1 ? "s" : ""}`, tone: "success" });
  }

  const activeFilterChips: { label: string; clear: () => void }[] = [];
  if (accountFilter === "all") activeFilterChips.push({ label: "All accounts", clear: () => setAccountFilter("active") });
  if (instrumentFilter !== "all") activeFilterChips.push({ label: instrumentFilter, clear: () => setInstrumentFilter("all") });
  if (directionFilter !== "all") activeFilterChips.push({ label: directionFilter, clear: () => setDirectionFilter("all") });
  if (sessionFilter !== "all") activeFilterChips.push({ label: sessionFilter, clear: () => setSessionFilter("all") });
  if (resultFilter !== "all") activeFilterChips.push({ label: resultFilter, clear: () => setResultFilter("all") });
  if (strategyFilter !== "all") activeFilterChips.push({ label: strategies.find((s) => s.id === strategyFilter)?.name ?? "Strategy", clear: () => setStrategyFilter("all") });
  if (dayFilter !== "all") activeFilterChips.push({ label: dayFilter, clear: () => setDayFilter("all") });
  if (tagFilter) activeFilterChips.push({ label: `#${tagFilter}`, clear: () => setTagFilter(null) });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[19px] font-semibold text-text-primary">Trading Journal</h2>
          <p className="text-[13px] text-text-secondary">Every trade, every detail, fully searchable.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="tertiary" onClick={() => setImportOpen(true)}><Upload size={14} /> Import Trades</Button>
          <Button variant="tertiary" onClick={handleExport}><Download size={14} /> Export</Button>
          <Button variant="primary" onClick={openAddTrade}>+ Add Trade</Button>
        </div>
      </div>

      <Card>
        <div className="flex flex-col gap-3 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search notes, setups, tags…"
                className="h-9 w-full rounded-md border border-border-strong bg-bg-elevated pl-8 pr-3 text-[13px] outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20"
              />
            </div>
            <Select className="w-auto min-w-[130px]" value={accountFilter} onChange={(e) => setAccountFilter(e.target.value)}>
              <option value="active">Active account</option>
              <option value="all">All accounts</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </Select>
            <Select className="w-auto min-w-[110px]" value={instrumentFilter} onChange={(e) => setInstrumentFilter(e.target.value)}>
              <option value="all">Instrument</option>
              {INSTRUMENT_LIST.map((i) => <option key={i.symbol} value={i.symbol}>{i.symbol}</option>)}
            </Select>
            <Select className="w-auto min-w-[100px]" value={directionFilter} onChange={(e) => setDirectionFilter(e.target.value as Direction | "all")}>
              <option value="all">Direction</option>
              <option value="Long">Long</option>
              <option value="Short">Short</option>
            </Select>
            <Select className="w-auto min-w-[110px]" value={sessionFilter} onChange={(e) => setSessionFilter(e.target.value as Session | "all")}>
              <option value="all">Session</option>
              <option value="Asian">Asian</option>
              <option value="London">London</option>
              <option value="New York">New York</option>
              <option value="Custom">Custom</option>
            </Select>
            <Select className="w-auto min-w-[100px]" value={resultFilter} onChange={(e) => setResultFilter(e.target.value as "all" | "Win" | "Loss")}>
              <option value="all">Win / Loss</option>
              <option value="Win">Win</option>
              <option value="Loss">Loss</option>
            </Select>
            <Select className="w-auto min-w-[130px]" value={strategyFilter} onChange={(e) => setStrategyFilter(e.target.value)}>
              <option value="all">Strategy</option>
              {strategies.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
            <Select className="w-auto min-w-[110px]" value={dayFilter} onChange={(e) => setDayFilter(e.target.value)}>
              <option value="all">Day of week</option>
              {DAY_NAMES.filter((d) => d !== "Saturday" && d !== "Sunday").map((d) => <option key={d} value={d}>{d}</option>)}
            </Select>
          </div>

          {activeFilterChips.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {activeFilterChips.map((chip) => (
                <Pill key={chip.label} active onClick={chip.clear}>
                  {chip.label} <X size={11} className="ml-1 inline" />
                </Pill>
              ))}
              <button
                onClick={() => { setAccountFilter("active"); setInstrumentFilter("all"); setDirectionFilter("all"); setSessionFilter("all"); setResultFilter("all"); setStrategyFilter("all"); setDayFilter("all"); setTagFilter(null); }}
                className="text-[12px] text-text-tertiary hover:text-text-primary"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      </Card>

      {resultFiltered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<BookText size={22} />}
            title={trades.length === 0 ? "Your journal starts here." : "No trades match these filters"}
            description={trades.length === 0 ? "Log your first trade to start building your performance history." : "Try adjusting or clearing your filters."}
            action={trades.length === 0 ? <Button variant="primary" onClick={openAddTrade}>+ Add Trade</Button> : undefined}
          />
        </Card>
      ) : (
        <Card className="p-4">
          <TradeTable trades={resultFiltered} onOpenTrade={(id) => router.push(`/journal/${id}`)} onDeleteTrades={handleBulkDelete} />
        </Card>
      )}

      <CsvImportModal open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}

export default function JournalPage() {
  return (
    <Suspense fallback={null}>
      <JournalContent />
    </Suspense>
  );
}
