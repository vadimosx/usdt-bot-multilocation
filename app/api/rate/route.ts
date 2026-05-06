import { NextResponse } from "next/server"
import { parseUsdEur } from "@/lib/usd-eur-parser"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const debug = process.env.DEBUG === "1"

  console.log("[v0] API /rate called, debug mode:", debug)

  // If debug, return raw upstream body from Binance (or Python fallback) for troubleshooting
  if (debug) {
    const pyBase = process.env.PY_SERVICE_URL?.replace(/\/$/, "")
    console.log("[v0] Debug mode - testing direct API calls, pyBase:", pyBase)

    try {
      if (pyBase) {
        console.log("[v0] Trying Python service:", pyBase + "/rate/usd-eur")
        const r = await fetch(pyBase + "/rate/usd-eur", { cache: "no-store" })
        const txt = await r.text().catch(() => null)
        console.log("[v0] Python service response:", r.status, txt?.slice(0, 200))
        return NextResponse.json({
          ok: r.ok,
          status: r.status,
          body: typeof txt === "string" ? txt.slice(0, 2000) : null,
        })
      } else {
        console.log("[v0] Trying direct Binance API")
        const r = await fetch("https://api.binance.com/api/v3/ticker/price?symbol=EURUSDT", { cache: "no-store" })
        const txt = await r.text().catch(() => null)
        console.log("[v0] Binance response:", r.status, txt?.slice(0, 200))
        return NextResponse.json({
          ok: r.ok,
          status: r.status,
          body: typeof txt === "string" ? txt.slice(0, 2000) : null,
        })
      }
    } catch (e) {
      console.log("[v0] Debug mode error:", e)
      return NextResponse.json({ ok: false, error: String(e) }, { status: 502 })
    }
  }

  console.log("[v0] Production mode - using parseUsdEur")
  const rate = await parseUsdEur(fetch)
  console.log("[v0] parseUsdEur returned:", rate)

  if (rate == null) {
    console.log("[v0] Rate is null, returning error")
    return NextResponse.json({ ok: false, error: "failed_to_get_rate" }, { status: 502 })
  }

  console.log("[v0] Returning successful rate:", rate)
  return NextResponse.json({ ok: true, usd_eur: rate })
}
