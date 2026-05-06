import { NextResponse } from "next/server"
import { activeLocation } from "@/config/locations"

export const dynamic = "force-dynamic"
export const revalidate = 0

const SHEET_ID = activeLocation.googleSheetId
const GID = "0"

interface MarginTier {
  min: number
  max: number
  margin: number
}

export async function GET() {
  try {
    const timestamp = Date.now()
    const csvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${GID}&_=${timestamp}`

    const response = await fetch(csvUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
      },
      cache: "no-store",
      redirect: "follow",
    })

    if (!response.ok) {
      console.error(`[v0] Failed to fetch rates from Google Sheets: HTTP ${response.status}`)
      return NextResponse.json(
        {
          error:
            "Не удалось загрузить данные из Google Sheets. Убедитесь, что таблица опубликована: File → Share → Publish to web → Publish",
          rubRate: null,
          rsdRate: null, // Added RSD rate
          usdtEurPercentage: null,
          fixUsdEurRate: null, // Add FIX rate to response
          rubEurTiers: [],
          usdtEurTiers: [],
        },
        { status: 500 },
      )
    }

    const csvText = await response.text()
    console.log("[v0] Raw CSV from Google Sheets:", csvText)

    const lines = csvText.split("\n").filter((line) => line.trim())

    if (lines.length < 2) {
      console.error("[v0] Not enough rows in CSV response from Google Sheets (need at least 2 rows)")
      return NextResponse.json(
        {
          error: "Недостаточно данных в Google Sheets",
          rubRate: null,
          rsdRate: null, // Added RSD rate
          usdtEurPercentage: null,
          fixUsdEurRate: null, // Add FIX rate to response
          rubEurTiers: [],
          usdtEurTiers: [],
        },
        { status: 500 },
      )
    }

    // Parse CSV line respecting quoted values
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

    // Get A2 value (second row, first column)
    const secondLine = lines[1]
    const cells = parseCSVLine(secondLine)

    console.log("[v0] Parsed cells from row 2:", cells)

    // A2: Replace comma with dot for decimal parsing
    const firstCell = cells[0].replace(/,/g, ".")
    const rubRate = Number.parseFloat(firstCell)

    if (isNaN(rubRate)) {
      console.error(`[v0] Invalid RUB rate value in A2: ${cells[0]}`)
      return NextResponse.json(
        {
          error: `Некорректное значение курса рубля: ${cells[0]}`,
          rubRate: null,
          rsdRate: null, // Added RSD rate
          usdtEurPercentage: null,
          fixUsdEurRate: null, // Add FIX rate to response
          rubEurTiers: [],
          usdtEurTiers: [],
        },
        { status: 500 },
      )
    }

    // Get B2 value (second row, second column)
    let usdtEurPercentage = 0
    if (cells.length >= 2) {
      const secondCell = cells[1].replace(/,/g, ".")
      console.log("[v0] B2 cell value:", cells[1])
      usdtEurPercentage = Number.parseFloat(secondCell)

      if (isNaN(usdtEurPercentage)) {
        console.error(`[v0] Invalid USDT/EUR percentage in B2: ${cells[1]}, using 0`)
        usdtEurPercentage = 0
      }
    }

    let rsdRate = 0
    if (cells.length >= 3) {
      const thirdCell = cells[2].replace(/,/g, ".")
      console.log("[v0] C2 cell value (EUR/RSD):", cells[2])
      rsdRate = Number.parseFloat(thirdCell)

      if (isNaN(rsdRate)) {
        console.error(`[v0] Invalid EUR/RSD rate in C2: ${cells[2]}, using 0`)
        rsdRate = 0
      }
    }

    let fixUsdEurRate: number | null = null
    if (cells.length >= 4) {
      const fourthCell = cells[3]?.trim()
      console.log("[v0] D2 cell value (FIX USDT/EUR):", fourthCell)

      if (fourthCell && fourthCell !== "") {
        const fixRate = Number.parseFloat(fourthCell.replace(/,/g, "."))
        if (!isNaN(fixRate) && fixRate > 0) {
          fixUsdEurRate = fixRate
          console.log(`[v0] ✓ FIX mode enabled: D2=${fourthCell} (USDT/EUR - EUR per 1 USDT)`)
        }
      } else {
        console.log("[v0] D2 is empty - will use Binance rate")
      }
    }

    const rubEurTiers: MarginTier[] = []
    const usdtEurTiers: MarginTier[] = []

    const fixedThresholds = [
      { min: 0, max: 499 }, // Changed from 100-499 to 0-499
      { min: 500, max: 1999 },
      { min: 2000, max: 4999 },
      { min: 5000, max: 9999 },
      { min: 10000, max: null },
    ]

    if (lines.length >= 4) {
      const row6 = parseCSVLine(lines[3]) // CSV line 3 = Google Sheets row 6
      console.log("[v0] Row 6 (USDT/EUR margins B6-F6):", row6)

      // Parse columns B through F (indices 1-5)
      for (let i = 1; i <= 5; i++) {
        const marginStr = row6[i]?.trim()
        if (!marginStr) continue

        const margin = Number.parseFloat(marginStr.replace(/,/g, "."))
        if (!isNaN(margin)) {
          const threshold = fixedThresholds[i - 1]
          usdtEurTiers.push({
            min: threshold.min,
            max: threshold.max ?? Number.POSITIVE_INFINITY,
            margin,
          })
          console.log(`[v0] Added USDT/EUR tier: ${threshold.min}-${threshold.max ?? "∞"} EUR → ${margin}%`)
        }
      }

      console.log("[v0] Parsed USDT/EUR tiers from row 6:", usdtEurTiers)
    } else {
      console.log("[v0] Row 6 not found in CSV for USDT/EUR tiers")
    }

    if (lines.length >= 6) {
      const row9 = parseCSVLine(lines[5]) // CSV line 5 = Google Sheets row 9
      console.log("[v0] Row 9 (RUB/EUR margins B9-F9):", row9)

      // Parse columns B through F (indices 1-5)
      for (let i = 1; i <= 5; i++) {
        const marginStr = row9[i]?.trim()
        if (!marginStr) continue

        const margin = Number.parseFloat(marginStr.replace(/,/g, "."))
        if (!isNaN(margin)) {
          const threshold = fixedThresholds[i - 1]
          rubEurTiers.push({
            min: threshold.min,
            max: threshold.max ?? Number.POSITIVE_INFINITY,
            margin,
          })
          console.log(`[v0] Added RUB/EUR tier: ${threshold.min}-${threshold.max ?? "∞"} EUR → ${margin}%`)
        }
      }

      console.log("[v0] Parsed RUB/EUR tiers from row 9:", rubEurTiers)
    } else {
      console.log("[v0] Row 9 not found in CSV for RUB/EUR tiers")
    }

    console.log(
      `[v0] ✓ Successfully fetched from Google Sheets - RUB rate: ${rubRate}, RSD rate: ${rsdRate}, USDT/EUR adjustment: ${usdtEurPercentage}%, FIX rate: ${fixUsdEurRate ? fixUsdEurRate.toFixed(6) : "none"}, RUB/EUR tiers: ${rubEurTiers.length}, USDT/EUR tiers: ${usdtEurTiers.length}`,
    )

    return NextResponse.json({
      rubRate,
      rsdRate,
      usdtEurPercentage,
      fixUsdEurRate, // Add FIX rate to response
      rubEurTiers,
      usdtEurTiers,
      source: "google_sheets",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[v0] Error fetching rates from Google Sheets:", error)
    return NextResponse.json(
      {
        error: "Ошибка при загрузке данных",
        rubRate: null,
        rsdRate: null, // Added RSD rate
        usdtEurPercentage: null,
        fixUsdEurRate: null, // Add FIX rate to response
        rubEurTiers: [],
        usdtEurTiers: [],
      },
      { status: 500 },
    )
  }
}
