import { NextResponse } from "next/server"
import { activeLocation } from "@/config/locations"
import { parseUsdEur } from "@/lib/usd-eur-parser"

export const dynamic = "force-dynamic"

const SHEET_ID = activeLocation.googleSheetId
const GID = "0"

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ""
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === "," && !inQuotes) {
      result.push(current.trim())
      current = ""
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

function applyMargin(rate: number, marginPercent: number): number {
  return rate * (1 + marginPercent / 100)
}

function getMarginForAmount(tiers: { min: number; max: number; margin: number }[], eurAmount: number): number {
  const tier = tiers.find((t) => eurAmount >= t.min && eurAmount <= t.max)
  return tier?.margin ?? tiers[0]?.margin ?? 0
}

export async function GET() {
  try {
    // 1. Get Binance USDT/EUR rate
    const binanceRate = await parseUsdEur(fetch)
    if (!binanceRate) {
      return NextResponse.json({ error: "Failed to get Binance rate" }, { status: 502 })
    }

    // 2. Get margins from Google Sheets
    const timestamp = Date.now()
    const csvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${GID}&_=${timestamp}`
    const res = await fetch(csvUrl, {
      headers: { "Cache-Control": "no-cache" },
      cache: "no-store",
    })

    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch Google Sheets" }, { status: 502 })
    }

    const csvText = await res.text()
    const lines = csvText.split("\n").filter((l) => l.trim())

    const cells = parseCSVLine(lines[1] ?? "")
    const rubRate = parseFloat(cells[0]?.replace(/,/g, ".") ?? "0") || 0
    const usdtEurAdj = parseFloat(cells[1]?.replace(/,/g, ".") ?? "0") || 0
    const rsdRate = parseFloat(cells[2]?.replace(/,/g, ".") ?? "0") || 0
    const fixRate = parseFloat(cells[3]?.replace(/,/g, ".") ?? "0") || null

    const baseRate = fixRate && fixRate > 0 ? fixRate : binanceRate * (1 + usdtEurAdj / 100)

    const fixedThresholds = [
      { min: 0, max: 499 },
      { min: 500, max: 1999 },
      { min: 2000, max: 4999 },
      { min: 5000, max: 9999 },
      { min: 10000, max: Infinity },
    ]

    // Parse USDT/EUR tiers (row 6 = lines[3])
    const usdtTiers: { min: number; max: number; margin: number }[] = []
    if (lines[3]) {
      const row = parseCSVLine(lines[3])
      for (let i = 1; i <= 5; i++) {
        const margin = parseFloat(row[i]?.replace(/,/g, ".") ?? "")
        if (!isNaN(margin)) {
          usdtTiers.push({ ...fixedThresholds[i - 1], margin })
        }
      }
    }

    // Parse RUB/EUR tiers (row 9 = lines[5])
    const rubTiers: { min: number; max: number; margin: number }[] = []
    if (lines[5]) {
      const row = parseCSVLine(lines[5])
      for (let i = 1; i <= 5; i++) {
        const margin = parseFloat(row[i]?.replace(/,/g, ".") ?? "")
        if (!isNaN(margin)) {
          rubTiers.push({ ...fixedThresholds[i - 1], margin })
        }
      }
    }

    // 3. Build response with computed rates for standard amounts
    const standardAmounts = [500, 1000, 2000, 5000, 10000]

    const usdtEurRates = standardAmounts.map((usdt) => {
      const eur = usdt * baseRate
      const margin = getMarginForAmount(usdtTiers, eur)
      const finalRate = applyMargin(baseRate, margin)
      return {
        usdt,
        eur: parseFloat((usdt * finalRate).toFixed(1)),
        rate: parseFloat(finalRate.toFixed(4)),
      }
    })

    const eurRubRates = standardAmounts.map((eur) => {
      const margin = getMarginForAmount(rubTiers, eur)
      const finalRubRate = applyMargin(rubRate, margin)
      return {
        eur,
        rub: parseFloat((eur * finalRubRate).toFixed(1)),
        rate: parseFloat(finalRubRate.toFixed(2)),
      }
    })

    // Spot rates for 1000 units (most common)
    const spotMarginUsdt = getMarginForAmount(usdtTiers, 1000 * baseRate)
    const spotRateUsdt = applyMargin(baseRate, spotMarginUsdt)

    const spotMarginRub = getMarginForAmount(rubTiers, 1000)
    const spotRateRub = applyMargin(rubRate, spotMarginRub)

    return NextResponse.json({
      location: activeLocation.name,
      updated_at: new Date().toISOString(),
      base_rate: parseFloat(binanceRate.toFixed(4)), // raw Binance USDT/EUR

      // Spot rates (for 1000 EUR equivalent)
      rates: {
        usdt_eur: parseFloat(spotRateUsdt.toFixed(4)),   // 1 USDT = X EUR
        eur_rub: parseFloat(spotRateRub.toFixed(2)),     // 1 EUR = X RUB
        eur_rsd: rsdRate > 0 ? parseFloat(rsdRate.toFixed(2)) : null,
      },

      // Tiered rates
      usdt_eur_tiers: usdtEurRates,
      eur_rub_tiers: eurRubRates,
    })
  } catch (err: any) {
    console.error("[rates] error:", err)
    return NextResponse.json({ error: err?.message || "Unknown error" }, { status: 500 })
  }
}
