"use client";

import { useMemo, useRef, useState } from "react";
import { UploadCloud, AlertCircle, CheckCircle2, FileText } from "lucide-react";
import { Modal, ModalHeader, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Select, Label } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useAppStore } from "@/lib/store";
import { IMPORT_FIELDS, parseCsv, validateAndBuildTrades, type ColumnMapping } from "@/lib/csv";
import { uid } from "@/lib/utils";

type Step = "upload" | "map" | "preview";

export function CsvImportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const accounts = useAppStore((s) => s.accounts);
  const activeAccountId = useAppStore((s) => s.activeAccountId);
  const importTrades = useAppStore((s) => s.importTrades);
  const { push } = useToast();
  const [targetAccountId, setTargetAccountId] = useState(activeAccountId ?? accounts[0]?.id ?? "");

  function reset() {
    setStep("upload");
    setFileName("");
    setHeaders([]);
    setRows([]);
    setMapping({});
  }

  async function handleFile(file: File) {
    const text = await file.text();
    const { headers: h, rows: r } = parseCsv(text);
    setFileName(file.name);
    setHeaders(h);
    setRows(r);
    const autoMapping: ColumnMapping = {};
    for (const field of IMPORT_FIELDS) {
      const match = h.find((header) => header.toLowerCase().includes(field.key) || header.toLowerCase().includes(field.label.toLowerCase().split(" ")[0]));
      if (match) autoMapping[field.key] = match;
    }
    setMapping(autoMapping);
    setStep("map");
  }

  const results = useMemo(
    () => (step === "preview" ? validateAndBuildTrades(headers, rows, mapping, targetAccountId, () => uid("trade")) : []),
    [step, headers, rows, mapping, targetAccountId]
  );
  const validCount = results.filter((r) => r.trade).length;
  const errorCount = results.length - validCount;

  const requiredMapped = IMPORT_FIELDS.filter((f) => f.required).every((f) => mapping[f.key]);

  function handleImport() {
    const trades = results.filter((r) => r.trade).map((r) => r.trade!);
    importTrades(trades);
    push({ title: `Imported ${trades.length} trades`, tone: "success", description: errorCount > 0 ? `${errorCount} rows were skipped due to errors.` : undefined });
    reset();
    onClose();
  }

  function handleClose() {
    reset();
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} size="lg">
      <ModalHeader title="Import Trades" subtitle="Upload a CSV, map its columns, then review before importing." onClose={handleClose} />
      <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
        {step === "upload" && (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
            className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border-strong bg-bg-elevated px-6 py-16 text-center"
          >
            <UploadCloud size={28} className="text-text-tertiary" />
            <p className="text-[14px] font-medium text-text-primary">Drop your CSV file here</p>
            <p className="text-[12.5px] text-text-secondary">or click below to browse. We support exports from most brokers and platforms.</p>
            <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>Choose file</Button>
            <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
          </div>
        )}

        {step === "map" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-[13px] text-text-secondary">
              <FileText size={15} /> {fileName} · {rows.length} rows detected
            </div>
            <div>
              <Label>Import into account</Label>
              <Select value={targetAccountId} onChange={(e) => setTargetAccountId(e.target.value)}>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </Select>
            </div>
            <div className="space-y-3">
              {IMPORT_FIELDS.map((field) => (
                <div key={field.key} className="grid grid-cols-2 items-center gap-3">
                  <Label className="mb-0">
                    {field.label} {field.required && <span className="text-neg">*</span>}
                  </Label>
                  <Select value={mapping[field.key] ?? ""} onChange={(e) => setMapping((m) => ({ ...m, [field.key]: e.target.value || undefined }))}>
                    <option value="">— Not mapped —</option>
                    {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                  </Select>
                </div>
              ))}
            </div>
            {!requiredMapped && (
              <div className="flex items-center gap-2 rounded-md border border-warning/30 bg-warning-soft px-3 py-2 text-[12.5px] text-warning">
                <AlertCircle size={14} /> Map all required fields to continue.
              </div>
            )}
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 text-[13px]">
              <span className="flex items-center gap-1.5 text-pos"><CheckCircle2 size={14} /> {validCount} valid</span>
              {errorCount > 0 && <span className="flex items-center gap-1.5 text-neg"><AlertCircle size={14} /> {errorCount} with errors (will be skipped)</span>}
            </div>
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-[12.5px]">
                <thead className="bg-surface-2 text-text-tertiary">
                  <tr>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">Date</th>
                    <th className="px-3 py-2 text-left">Symbol</th>
                    <th className="px-3 py-2 text-left">Entry</th>
                    <th className="px-3 py-2 text-left">Exit</th>
                    <th className="px-3 py-2 text-left">Qty</th>
                    <th className="px-3 py-2 text-left">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {results.slice(0, 50).map((r, i) => (
                    <tr key={i} className={r.errors.length ? "bg-neg-soft/40" : ""}>
                      <td className="px-3 py-2">{r.trade ? <CheckCircle2 size={14} className="text-pos" /> : <AlertCircle size={14} className="text-neg" />}</td>
                      <td className="px-3 py-2">{r.trade?.date ?? r.row[0]}</td>
                      <td className="px-3 py-2">{r.trade?.instrument ?? "—"}</td>
                      <td className="px-3 py-2">{r.trade?.entryPrice ?? "—"}</td>
                      <td className="px-3 py-2">{r.trade?.exitPrice ?? "—"}</td>
                      <td className="px-3 py-2">{r.trade?.contracts ?? "—"}</td>
                      <td className="px-3 py-2 text-neg">{r.errors.join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      <ModalFooter>
        {step !== "upload" && (
          <Button variant="tertiary" onClick={() => setStep(step === "preview" ? "map" : "upload")}>Back</Button>
        )}
        <Button variant="tertiary" onClick={handleClose}>Cancel</Button>
        {step === "map" && (
          <Button variant="primary" disabled={!requiredMapped} onClick={() => setStep("preview")}>Preview import</Button>
        )}
        {step === "preview" && (
          <Button variant="primary" disabled={validCount === 0} onClick={handleImport}>Import {validCount} trades</Button>
        )}
      </ModalFooter>
    </Modal>
  );
}
