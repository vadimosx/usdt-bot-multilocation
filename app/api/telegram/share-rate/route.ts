import { NextResponse } from "next/server"
import { activeLocation } from "@/config/locations"

function escapeHtml(text = "") {
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { fromCurrency, toCurrency, fromAmount, toAmount, rate, rateDisplay } = body

    const botToken = process.env.TELEGRAM_BOT_TOKEN
    const chatId = body.telegramUserId ? String(body.telegramUserId) : null

    if (!botToken || !chatId) {
      return NextResponse.json({ error: "Доступно только через Telegram бот" }, { status: 400 })
    }

    const now = new Date().toLocaleString("ru-RU", {
      timeZone: activeLocation.timezone,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })

    const safe = (t: any) => escapeHtml(String(t || ""))

    let message = `💱 <b>Расчёт курса обмена</b>\n\n`
    message += `📊 Направление: ${safe(fromCurrency)} → ${safe(toCurrency)}\n`
    message += `💰 Отдаёте: ${safe(fromAmount)} ${safe(fromCurrency)}\n`
    message += `💵 Получаете: <b>${safe(toAmount)} ${safe(toCurrency)}</b>\n`
    if (rateDisplay) {
      message += `📈 Курс: ${safe(rateDisplay)}\n`
    }
    message += `\n📍 ${safe(activeLocation.name)}\n`
    message += `⏰ Курс сформирован: ${now}\n`
    message += `\n━━━━━━━━━━━━━━━━━━\n`
    message += `Актуальный курс всегда доступен в нашем боте:\n`
    message += `👉 @${activeLocation.botUsername}`

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json({ error: "Ошибка отправки в Telegram", details: data }, { status: response.status })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: "Ошибка сервера", details: error?.message }, { status: 500 })
  }
}
