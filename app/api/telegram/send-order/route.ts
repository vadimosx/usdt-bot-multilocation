import { NextResponse } from "next/server"
import { activeLocation } from "@/config/locations"
import { getCityName } from "@/config/types"

function escapeHtml(text = "") {
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      fromCurrency,
      toCurrency,
      fromAmount,
      toAmount,
      fromBank,
      toBank,
      rate,
      telegramUsername,
      telegramUserId,
      isTelegramWebApp,
      city,
    } = body

    const botToken = process.env.TELEGRAM_BOT_TOKEN
    const chatId = process.env.TELEGRAM_GROUP_ID

    if (!botToken || !chatId) {
      console.log("[v0] Telegram credentials not configured")
      return NextResponse.json({ error: "Telegram не настроен" }, { status: 400 })
    }

    const safe = (t: any) => escapeHtml(String(t || ""))

    let telegramContactLine = ""

    if (isTelegramWebApp) {
      // Запущено через Telegram WebApp - делаем кликабельные ссылки
      if (telegramUsername) {
        const cleanUsername = String(telegramUsername).replace(/^@/, "").trim()
        telegramContactLine = `👤 Telegram: <a href="https://t.me/${cleanUsername}">@${safe(cleanUsername)}</a>`
      } else if (telegramUserId) {
        telegramContactLine = `👤 Telegram: <a href="tg://user?id=${telegramUserId}">nonickname</a>`
      } else {
        telegramContactLine = `👤 Telegram: N/A`
      }
    } else {
      // Запущено через веб - просто текст без ссылок
      const contact = telegramUsername || "N/A"
      telegramContactLine = `👤 Контакт: ${safe(contact)}`
    }

    let groupMessage = `🔔 <b>Новая заявка на обмен (${safe(activeLocation.name)})</b>\n\n`
    groupMessage += `${telegramContactLine}\n`
    if (city) {
      groupMessage += `📍 Город: ${safe(getCityName(activeLocation, city))}\n`
    }
    groupMessage += `\n📊 Направление: ${safe(fromCurrency)} → ${safe(toCurrency)}\n`
    groupMessage += `💰 Отдает: ${safe(fromAmount)} ${safe(fromCurrency)}\n`
    groupMessage += `💵 Получает: ${safe(toAmount)} ${safe(toCurrency)}\n`

    if (fromBank) groupMessage += `🏦 Банк отправителя: ${safe(fromBank)}\n`
    if (toBank) groupMessage += `🏦 Банк получателя: ${safe(toBank)}\n`

    groupMessage += `\n📈 Курс: 1 ${safe(fromCurrency)} = ${safe(rate)} ${safe(toCurrency)}\n`
    groupMessage += `\n⏰ Время: ${safe(new Date().toLocaleString("ru-RU", { timeZone: activeLocation.timezone }))}`

    console.log("[v0] Sending message to Telegram group:")
    console.log("[v0] Group message text:", groupMessage)

    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`

    const groupResponse = await fetch(telegramUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: groupMessage,
        parse_mode: "HTML",
      }),
    })

    const groupData = await groupResponse.json()

    if (!groupResponse.ok) {
      console.log("[v0] Telegram API error (group):", JSON.stringify(groupData, null, 2))
      return NextResponse.json(
        { error: "Ошибка отправки в Telegram группу", details: groupData },
        { status: groupResponse.status },
      )
    }

    console.log("[v0] Order sent to Telegram group successfully")

    if (isTelegramWebApp && telegramUserId) {
      const clientMessage =
        `✅ <b>Ваша заявка принята в работу!</b>\n\n` +
        `📊 Обмен: ${safe(fromAmount)} ${safe(fromCurrency)} → ${safe(toAmount)} ${safe(toCurrency)}\n\n` +
        `⏳ Наш оператор скоро свяжется с вами для завершения обмена.\n\n` +
        `Спасибо за доверие! 🙏`

      console.log("[v0] Sending confirmation to client:", telegramUserId)

      const clientResponse = await fetch(telegramUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: telegramUserId,
          text: clientMessage,
          parse_mode: "HTML",
        }),
      })

      const clientData = await clientResponse.json()

      if (!clientResponse.ok) {
        console.log("[v0] Failed to send confirmation to client:", JSON.stringify(clientData, null, 2))
        // Не возвращаем ошибку, так как основное сообщение в группу уже отправлено
      } else {
        console.log("[v0] Confirmation sent to client successfully")
      }
    }

    return NextResponse.json({ success: true, message: "Заявка отправлена в Telegram" })
  } catch (error: any) {
    console.log("[v0] Error sending to Telegram:", error)
    return NextResponse.json(
      { error: "Ошибка при отправке заявки", details: error?.message || String(error) },
      { status: 500 },
    )
  }
}
