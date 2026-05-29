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

type Tier = { min: number; max: number; margin: number }

function getMargin(tiers: Tier[], eurAmount: number): number {
  if (tiers.length === 0) return 0.015
  for (const tier of tiers) {
    if (tier.max === Infinity) {
      if (eurAmount >= tier.min) return Math.abs(tier.margin) / 100
    } else if (eurAmount >= tier.min && eurAmount < tier.max) {
      return Math.abs(tier.margin) / 100
    }
  }
  return Math.abs(tiers[tiers.length - 1].margin) / 100
}

// Exact same logic as calculator's convertUsdtToEur
function convertUsdtToEur(usdt: number, effectiveRate: number, usdtTiers: Tier[]): number {
  const eurBeforeMargin = usdt * effectiveRate
  const margin = getMargin(usdtTiers, eurBeforeMargin)
  return eurBeforeMargin * (1 - margin)
}

// Exact same logic as calculator's convertEurToUsdt
function convertEurToUsdt(eur: number, effectiveRate: number, usdtTiers: Tier[]): number {
  const usdtBeforeMargin = eur / effectiveRate
  const margin = getMargin(usdtTiers, eur)
  return usdtBeforeMargin * (1 - margin)
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
    const res = await fetch(csvUrl, { headers: { "Cache-Control": "no-cache" }, cache: "no-store" })
    if (!res.ok) return NextResponse.json({ error: "Failed to fetch Google Sheets" }, { status: 502 })

    const csvText = await res.text()
    const lines = csvText.split("\n").filter((l) => l.trim())
    const cells = parseCSVLine(lines[1] ?? "")

    const rubRate = parseFloat(cells[0]?.replace(/,/g, ".") ?? "0") || 0       // A2: RUB per 1 USDT
    const usdtEurAdj = parseFloat(cells[1]?.replace(/,/g, ".") ?? "0") || 0    // B2: buyback %
    const rsdRate = parseFloat(cells[2]?.replace(/,/g, ".") ?? "0") || 0       // C2: RSD per 1 EUR
    const fixRateRaw = parseFloat(cells[3]?.replace(/,/g, ".") ?? "")
    const fixRate = !isNaN(fixRateRaw) && fixRateRaw > 0 ? fixRateRaw : null   // D2: FIX rate

    // effectiveRate — same as calculator (Binance + buyback adjustment, or FIX)
    const effectiveRate = fixRate ?? binanceRate * (1 + usdtEurAdj / 100)

    const fixedThresholds: Omit<Tier, "margin">[] = [
      { min: 0,     max: 499 },
      { min: 500,   max: 1999 },
      { min: 2000,  max: 4999 },
      { min: 5000,  max: 9999 },
      { min: 10000, max: Infinity },
    ]

    // USDT/EUR tiers (row 6 = lines[3])
    const usdtTiers: Tier[] = []
    if (lines[3]) {
      const row = parseCSVLine(lines[3])
      for (let i = 1; i <= 5; i++) {
        const margin = parseFloat(row[i]?.replace(/,/g, ".") ?? "")
        if (!isNaN(margin)) usdtTiers.push({ ...fixedThresholds[i - 1], margin })
      }
    }

    // RUB/EUR tiers (row 9 = lines[5]) — used only for RUB→EUR direct (not used via USDT path)
    // Note: EUR→RUB in calculator goes EUR→USDT (with usdtTiers), then USDT * rubRate
    // So rubRate is USDT/RUB, and the USDT margin already applies

    // 3. Compute rates for standard amounts using exact same formulas as calculator

    // USDT → EUR
    const usdtAmounts = [300, 500, 1000, 2000, 5000, 10000]
    const usdtEurTable = usdtAmounts.map((usdt) => {
      const eur = convertUsdtToEur(usdt, effectiveRate, usdtTiers)
      return { usdt, eur: parseFloat(eur.toFixed(1)), rate: parseFloat((eur / usdt).toFixed(4)) }
    })

    // EUR → RUB (via EUR→USDT→RUB, same as calculator)
    const eurAmounts = [300, 500, 1000, 2000, 5000, 10000]
    const eurRubTable = eurAmounts.map((eur) => {
      const usdt = convertEurToUsdt(eur, effectiveRate, usdtTiers)
      const rub = usdt * rubRate
      return { eur, rub: parseFloat(rub.toFixed(1)), rate: parseFloat((rub / eur).toFixed(2)) }
    })

    // Spot rates for 1000 USDT / 1000 EUR
    const spot1000Eur = convertUsdtToEur(1000, effectiveRate, usdtTiers)
    const spotRubFor1000Eur = convertEurToUsdt(1000, effectiveRate, usdtTiers) * rubRate

    return NextResponse.json({
      location: activeLocation.name,
      updated_at: new Date().toISOString(),
      rate_source: fixRate ? "fix" : "binance",
      binance_rate: parseFloat(binanceRate.toFixed(4)),

      // Spot rates (for 1000 units)
      rates: {
        usdt_eur: parseFloat((spot1000Eur / 1000).toFixed(4)),     // 1 USDT = X EUR
        eur_rub: parseFloat((spotRubFor1000Eur / 1000).toFixed(2)), // 1 EUR = X RUB
        eur_rsd: rsdRate > 0 ? parseFloat(rsdRate.toFixed(2)) : null,
      },

      // Detailed tables
      usdt_to_eur: usdtEurTable,
      eur_to_rub: eurRubTable,
    })
  } catch (err: any) {
    console.error("[rates] error:", err)
    return NextResponse.json({ error: err?.message || "Unknown error" }, { status: 500 })
  }
}
