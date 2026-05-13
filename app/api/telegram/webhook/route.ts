import { NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { activeLocation } from "@/config/locations"

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

function escapeHtml(text = "") {
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

async function sendMessage(botToken: string, chatId: number | string, text: string, extra?: object) {
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", ...extra }),
  })
}

async function sendChatAction(botToken: string, chatId: number | string) {
  await fetch(`https://api.telegram.org/bot${botToken}/sendChatAction`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, action: "typing" }),
  })
}

function getSystemPrompt(): string {
  const location = activeLocation.name
  const cities = activeLocation.cities.map((c) => c.name).join(", ")
  const botUsername = activeLocation.botUsername

  return `Ты — вежливый помощник обменного пункта USDT Man (${location}).
Отвечай кратко, по делу, на том языке на котором пишет пользователь (русский или английский).

ИНФОРМАЦИЯ ОБ ОБМЕННИКЕ:
- Локация: ${location}
- Города: ${cities}
- Минимальная сумма: 300 EUR (или эквивалент)
- Режим работы: 8:00 — 22:00
- Валюты: ${activeLocation.currencies.map((c) => c.label).join(", ")}
- Направления обмена: ${activeLocation.exchangeDirections.map((d) => d.name).join(", ")}

КАК РАБОТАЕТ ОБМЕН:
- Личная встреча — вы сами видите деньги, можете пересчитать
- Никакой предоплаты — сначала вы переводите криптовалюту, сразу получаете наличные евро
- Доставка за город возможна, стоимость обсуждается отдельно в зависимости от локации

КОМИССИИ:
- Комиссия уже включена в курс, никаких дополнительных комиссий
- Актуальный курс всегда в боте @${botUsername}

ПРАВИЛА ОТВЕТОВ:
1. Если пользователь хочет узнать курс или сделать обмен — скажи что курс доступен в калькуляторе и предложи открыть его
2. Если вопрос не относится к обменнику — вежливо скажи что можешь помочь только по теме обмена валют
3. Если вопрос сложный, нестандартный, или пользователь явно просит оператора — в конце ответа добавь строго: [НУЖЕН_ОПЕРАТОР]
4. Никогда не выдумывай курсы — говори что актуальный курс в калькуляторе
5. Будь дружелюбным, отвечай коротко (2-4 предложения максимум)`
}

async function askClaude(userMessage: string): Promise<{ text: string; needsOperator: boolean }> {
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 300,
    system: getSystemPrompt(),
    messages: [{ role: "user", content: userMessage }],
  })

  const text = response.content[0].type === "text" ? response.content[0].text : ""
  const needsOperator = text.includes("[НУЖЕН_ОПЕРАТОР]")
  const cleanText = text.replace("[НУЖЕН_ОПЕРАТОР]", "").trim()

  return { text: cleanText, needsOperator }
}

export async function POST(request: Request) {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN
    const groupId = process.env.TELEGRAM_GROUP_ID
    const operatorUsername = process.env.TELEGRAM_OPERATOR_USERNAME

    if (!botToken) {
      return NextResponse.json({ error: "Bot token not configured" }, { status: 400 })
    }

    const update = await request.json()
    console.log("[webhook] update type:", Object.keys(update).filter(k => k !== "update_id").join(", "))

    // Handle inline query
    if (update.inline_query) {
      const inlineQuery = update.inline_query
      const queryText = inlineQuery.query.trim()
      const queryId = inlineQuery.id

      const match = queryText.match(/^(\d+(?:[.,]\d+)?)\s*(EUR|RUB|USDT|RSD)\s*(EUR|RUB|USDT|RSD)?$/i)

      if (!match) {
        await answerInlineQuery(botToken, queryId, [{
          type: "article",
          id: "help",
          title: "Формат: 100 USDT EUR",
          description: "Введите сумму и валюты, например: 500 USDT EUR",
          input_message_content: { message_text: "Откройте калькулятор обмена в боте @" + activeLocation.botUsername },
        }])
        return NextResponse.json({ ok: true })
      }

      await answerInlineQuery(botToken, queryId, [{
        type: "article",
        id: "calc",
        title: "Открыть калькулятор",
        description: "Актуальный курс в нашем боте",
        input_message_content: { message_text: `Актуальный курс и калькулятор обмена: @${activeLocation.botUsername}` },
      }])
      return NextResponse.json({ ok: true })
    }

    // Handle text messages
    if (update.message) {
      const message = update.message
      const chatId = message.chat.id
      const text = message.text || ""
      const username = message.from?.username || ""
      const firstName = message.from?.first_name || "Пользователь"

      // /start command
      if (text === "/start") {
        const webAppUrl = `https://t.me/${activeLocation.botUsername}/app`
        await sendMessage(botToken, chatId,
          `👋 Привет, <b>${escapeHtml(firstName)}</b>!\n\n` +
          `Я помощник обменника <b>USDT Man ${activeLocation.name}</b>.\n\n` +
          `💱 Обмен USDT, EUR${activeLocation.currencies.find(c => c.value === "RUB") ? ", RUB" : ""} наличными\n` +
          `📍 Города: ${activeLocation.cities.map(c => c.name).join(", ")}\n` +
          `⏰ Работаем: 8:00 — 22:00\n\n` +
          `Задайте любой вопрос или откройте калькулятор 👇`,
          {
            reply_markup: {
              inline_keyboard: [[
                { text: "💱 Открыть калькулятор", web_app: { url: `https://t.me/${activeLocation.botUsername}/app` } }
              ]]
            }
          }
        )
        return NextResponse.json({ ok: true })
      }

      // Skip non-text messages
      if (!text || text.startsWith("/")) {
        return NextResponse.json({ ok: true })
      }

      // Show typing indicator
      await sendChatAction(botToken, chatId)

      // No API key — fallback to simple response
      if (!process.env.ANTHROPIC_API_KEY) {
        const operatorContact = operatorUsername ? `@${operatorUsername}` : "оператора"
        await sendMessage(botToken, chatId,
          `Для ответа на ваш вопрос свяжитесь с оператором: ${operatorContact}`,
          {
            reply_markup: {
              inline_keyboard: [[
                { text: "💱 Открыть калькулятор", web_app: { url: `https://t.me/${activeLocation.botUsername}/app` } }
              ]]
            }
          }
        )
        return NextResponse.json({ ok: true })
      }

      // Ask Claude
      let aiReply: string
      let needsOperator = false

      try {
        const result = await askClaude(text)
        aiReply = result.text
        needsOperator = result.needsOperator
      } catch (err) {
        console.error("[webhook] Claude error:", err)
        aiReply = "Извините, не могу ответить прямо сейчас. Обратитесь к оператору."
        needsOperator = true
      }

      // Build reply keyboard
      const keyboard: any[][] = [[
        { text: "💱 Открыть калькулятор", web_app: { url: `https://t.me/${activeLocation.botUsername}/app` } }
      ]]

      if (needsOperator && operatorUsername) {
        keyboard.push([{ text: `👤 Написать оператору`, url: `https://t.me/${operatorUsername}` }])
      }

      await sendMessage(botToken, chatId, aiReply, {
        reply_markup: { inline_keyboard: keyboard }
      })

      // Ping group if operator needed
      if (needsOperator && groupId) {
        const userLink = username
          ? `<a href="https://t.me/${username}">@${escapeHtml(username)}</a>`
          : `<a href="tg://user?id=${chatId}">${escapeHtml(firstName)}</a>`

        await sendMessage(botToken, groupId,
          `🙋 <b>Пользователь просит оператора</b>\n\n` +
          `👤 ${userLink}\n` +
          `💬 Вопрос: <i>${escapeHtml(text)}</i>`
        )
      }

      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error("[webhook] error:", error)
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 })
  }
}

async function answerInlineQuery(botToken: string, queryId: string, results: any[]) {
  await fetch(`https://api.telegram.org/bot${botToken}/answerInlineQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ inline_query_id: queryId, results, cache_time: 10 }),
  })
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
      allowed_updates: ["message", "inline_query"],
    }),
  })

  const data = await response.json()
  return NextResponse.json({ webhookUrl, telegramResponse: data })
}
