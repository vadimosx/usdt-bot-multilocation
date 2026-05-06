import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN

    if (!botToken) {
      console.log("[v0] Telegram bot token not configured")
      return NextResponse.json({ error: "Bot token not configured" }, { status: 400 })
    }

    const update = await request.json()
    console.log("[v0] Telegram webhook received:", JSON.stringify(update, null, 2))

    // Handle inline query
    if (update.inline_query) {
      const inlineQuery = update.inline_query
      const queryText = inlineQuery.query.trim()
      const queryId = inlineQuery.id

      console.log("[v0] Inline query:", queryText)

      // Parse query: "100 EUR RUB" or "500 RUB EUR"
      const match = queryText.match(/^(\d+(?:[.,]\d+)?)\s*(EUR|RUB|USDT)\s*(EUR|RUB|USDT)?$/i)

      if (!match) {
        // Show help message if format is wrong
        const results = [
          {
            type: "article",
            id: "help",
            title: "Формат: 100 EUR RUB",
            description: "Введите сумму и валюты, например: 100 EUR RUB или 500 USDT EUR",
            input_message_content: {
              message_text:
                "Калькулятор обмена валют\n\nФормат: сумма ВАЛЮТА_ИЗ ВАЛЮТА_В\nПример: 100 EUR RUB\n\nПоддерживаемые валюты: EUR, RUB, USDT",
            },
          },
        ]

        await answerInlineQuery(botToken, queryId, results)
        return NextResponse.json({ ok: true })
      }

      const amount = parseFloat(match[1].replace(",", "."))
      const fromCurrency = match[2].toUpperCase()
      const toCurrency = match[3]?.toUpperCase() || (fromCurrency === "EUR" ? "RUB" : "EUR")

      if (fromCurrency === toCurrency) {
        const results = [
          {
            type: "article",
            id: "error",
            title: "Ошибка: одинаковые валюты",
            description: "Выберите разные валюты для обмена",
            input_message_content: {
              message_text: "Ошибка: нельзя обменять валюту на саму себя",
            },
          },
        ]
        await answerInlineQuery(botToken, queryId, results)
        return NextResponse.json({ ok: true })
      }

      // Fetch current rates
      const ratesResponse = await fetch("https://app.usdtman.com/api/rub-rate")
      const ratesData = await ratesResponse.json()

      // Fetch Binance rate for USDT/EUR
      let binanceRate = 0.92 // fallback
      try {
        const binanceResponse = await fetch(
          "https://api.binance.com/api/v3/ticker/price?symbol=EURUSDT"
        )
        const binanceData = await binanceResponse.json()
        if (binanceData.price) {
          binanceRate = 1 / parseFloat(binanceData.price) // USDT per EUR -> EUR per USDT
        }
      } catch (e) {
        console.log("[v0] Binance fetch error, using fallback")
      }

      // Calculate exchange
      const result = calculateExchange(
        fromCurrency,
        toCurrency,
        amount,
        ratesData.rubRate || 97,
        binanceRate,
        ratesData.fixUsdEurRate,
        ratesData.usdtEurTiers || [],
        ratesData.rubEurTiers || []
      )

      const date = new Date().toLocaleDateString("ru-RU", { timeZone: "Europe/Belgrade" })
      const time = new Date().toLocaleTimeString("ru-RU", {
        timeZone: "Europe/Belgrade",
        hour: "2-digit",
        minute: "2-digit",
      })

      const messageText =
        `💱 <b>Расчет обмена</b>\n\n` +
        `💰 ${formatNumber(amount)} ${fromCurrency} = <b>${formatNumber(result.toAmount)} ${toCurrency}</b>\n` +
        `📊 Курс: ${formatNumber(result.rate)} ${toCurrency}/${fromCurrency}\n\n` +
        `📅 Актуально на ${date} в ${time}\n` +
        `🔗 Проверить курс: @rs_changebot`

      const results = [
        {
          type: "article",
          id: `calc_${Date.now()}`,
          title: `${formatNumber(amount)} ${fromCurrency} = ${formatNumber(result.toAmount)} ${toCurrency}`,
          description: `Курс: ${formatNumber(result.rate)} ${toCurrency}/${fromCurrency}`,
          input_message_content: {
            message_text: messageText,
            parse_mode: "HTML",
          },
        },
      ]

      await answerInlineQuery(botToken, queryId, results)
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.log("[v0] Webhook error:", error)
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 })
  }
}

async function answerInlineQuery(botToken: string, queryId: string, results: any[]) {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/answerInlineQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      inline_query_id: queryId,
      results,
      cache_time: 10, // Cache for 10 seconds
    }),
  })

  const data = await response.json()
  console.log("[v0] answerInlineQuery response:", JSON.stringify(data, null, 2))
  return data
}

function formatNumber(num: number): string {
  return num.toLocaleString("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

interface MarginTier {
  min: number
  max: number
  margin: number
}

function getMarginForAmount(amount: number, tiers: MarginTier[]): number {
  if (!tiers || tiers.length === 0) return 0

  for (const tier of tiers) {
    if (amount >= tier.min && amount <= tier.max) {
      return tier.margin
    }
  }

  // If amount is larger than all tiers, use the last tier's margin
  const sortedTiers = [...tiers].sort((a, b) => b.max - a.max)
  return sortedTiers[0]?.margin || 0
}

function calculateExchange(
  fromCurrency: string,
  toCurrency: string,
  amount: number,
  rubRate: number,
  binanceRate: number,
  fixUsdEurRate: number | null,
  usdtEurTiers: MarginTier[],
  rubEurTiers: MarginTier[]
): { toAmount: number; rate: number } {
  let toAmount = 0
  let rate = 0

  // USDT -> EUR
  if (fromCurrency === "USDT" && toCurrency === "EUR") {
    const baseRate = fixUsdEurRate || binanceRate
    const margin = getMarginForAmount(amount, usdtEurTiers)
    rate = baseRate * (1 - margin / 100)
    toAmount = amount * rate
  }
  // EUR -> USDT
  else if (fromCurrency === "EUR" && toCurrency === "USDT") {
    const baseRate = fixUsdEurRate || binanceRate
    const margin = getMarginForAmount(amount, usdtEurTiers)
    rate = 1 / (baseRate * (1 + margin / 100))
    toAmount = amount * rate
  }
  // RUB -> EUR
  else if (fromCurrency === "RUB" && toCurrency === "EUR") {
    const margin = getMarginForAmount(amount / rubRate, rubEurTiers) // Convert to EUR for tier lookup
    rate = 1 / (rubRate * (1 + margin / 100))
    toAmount = amount * rate
  }
  // EUR -> RUB
  else if (fromCurrency === "EUR" && toCurrency === "RUB") {
    const margin = getMarginForAmount(amount, rubEurTiers)
    rate = rubRate * (1 - margin / 100)
    toAmount = amount * rate
  }
  // USDT -> RUB (via EUR)
  else if (fromCurrency === "USDT" && toCurrency === "RUB") {
    const usdtEurRate = fixUsdEurRate || binanceRate
    const eurAmount = amount * usdtEurRate
    const margin = getMarginForAmount(eurAmount, rubEurTiers)
    rate = usdtEurRate * rubRate * (1 - margin / 100)
    toAmount = amount * rate
  }
  // RUB -> USDT (via EUR)
  else if (fromCurrency === "RUB" && toCurrency === "USDT") {
    const usdtEurRate = fixUsdEurRate || binanceRate
    const eurAmount = amount / rubRate
    const margin = getMarginForAmount(eurAmount, usdtEurTiers)
    rate = 1 / (rubRate * usdtEurRate * (1 + margin / 100))
    toAmount = amount * rate
  }

  return { toAmount, rate }
}

// GET endpoint to set webhook
export async function GET(request: Request) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN

  if (!botToken) {
    return NextResponse.json({ error: "Bot token not configured" }, { status: 400 })
  }

  const url = new URL(request.url)
  const webhookUrl = `${url.origin}/api/telegram/webhook`

  const response = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: webhookUrl,
      allowed_updates: ["inline_query"],
    }),
  })

  const data = await response.json()
  console.log("[v0] setWebhook response:", JSON.stringify(data, null, 2))

  return NextResponse.json({
    message: "Webhook setup attempted",
    webhookUrl,
    telegramResponse: data,
  })
}
