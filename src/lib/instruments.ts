import type { InstrumentSpec, InstrumentSymbol } from "./types";

// Real-world CME/ICE futures tick specs used for accurate P&L and
// position-size math throughout the app.
export const INSTRUMENTS: Record<InstrumentSymbol, InstrumentSpec> = {
  NQ: { symbol: "NQ", name: "Nasdaq-100 E-mini", tickSize: 0.25, tickValue: 5, pointValue: 20, category: "Index" },
  ES: { symbol: "ES", name: "S&P 500 E-mini", tickSize: 0.25, tickValue: 12.5, pointValue: 50, category: "Index" },
  MNQ: { symbol: "MNQ", name: "Nasdaq-100 Micro", tickSize: 0.25, tickValue: 0.5, pointValue: 2, category: "Index" },
  MES: { symbol: "MES", name: "S&P 500 Micro", tickSize: 0.25, tickValue: 1.25, pointValue: 5, category: "Index" },
  YM: { symbol: "YM", name: "Dow E-mini", tickSize: 1, tickValue: 5, pointValue: 5, category: "Index" },
  RTY: { symbol: "RTY", name: "Russell 2000 E-mini", tickSize: 0.1, tickValue: 5, pointValue: 50, category: "Index" },
  CL: { symbol: "CL", name: "Crude Oil", tickSize: 0.01, tickValue: 10, pointValue: 1000, category: "Energy" },
  GC: { symbol: "GC", name: "Gold", tickSize: 0.1, tickValue: 10, pointValue: 100, category: "Metal" },
};

export const INSTRUMENT_LIST = Object.values(INSTRUMENTS);

export function pointsToDollars(symbol: InstrumentSymbol, points: number, contracts: number) {
  return points * INSTRUMENTS[symbol].pointValue * contracts;
}
