// Кэш для хранения результата
let cache: { value: number | null; timestamp: number } | null = null
const CACHE_TTL = 55000 // 55 секунд

// Функция ретрая с экспоненциальным бэкоффом
async function retryWithBackoff<T>(fn: () => Promise<T>, maxRetries = 3, baseDelay = 300): Promise<T> {
  let lastError: any

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      if (attempt === maxRetries - 1) {
        throw lastError
      }

      // Экспоненциальный бэкофф: 300ms → 900ms → 2700ms
      const delay = baseDelay * Math.pow(3, attempt)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

export async function parseUsdEur(fetchFn: typeof fetch = fetch): Promise<number | null> {
  const now = Date.now()

  // Проверяем кэш
  if (cache && cache.value !== null && now - cache.timestamp < CACHE_TTL) {
    console.log("[v0] Using cached rate:", cache.value)
    return cache.value
  }

  console.log("[v0] Trying exchangerate.host API")
  try {
    const res = await retryWithBackoff(async () => {
      const response = await fetchFn("https://api.exchangerate.host/latest?base=USD&symbols=EUR", {
        method: "GET",
        headers: {
          Accept: "application/json",
          "User-Agent": "Mozilla/5.0 (compatible; Exchange Rate Bot)",
        },
        cache: "no-store",
      })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      return response
    })

    const j = await res.json().catch(() => null)
    const eurRate = j?.rates?.EUR
    console.log("[v0] Exchangerate.host response:", j)

    if (typeof eurRate === "number" && isFinite(eurRate) && eurRate > 0) {
      console.log("[v0] Got valid USD/EUR rate from exchangerate.host:", eurRate)
      cache = { value: eurRate, timestamp: now }
      return eurRate
    }
  } catch (error) {
    console.log("[v0] Exchangerate.host failed:", error)
  }

  console.log("[v0] Falling back to ExchangeRate-API")
  try {
    const res = await retryWithBackoff(async () => {
      const response = await fetchFn("https://api.exchangerate-api.com/v4/latest/USD", {
        method: "GET",
        headers: {
          Accept: "application/json",
          "User-Agent": "Mozilla/5.0 (compatible; Exchange Rate Bot)",
        },
        cache: "no-store",
      })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      return response
    })

    const j = await res.json().catch(() => null)
    const eurRate = j?.rates?.EUR
    console.log("[v0] ExchangeRate-API response:", j)

    if (typeof eurRate === "number" && isFinite(eurRate) && eurRate > 0) {
      console.log("[v0] Got valid USD/EUR rate from ExchangeRate-API:", eurRate)
      cache = { value: eurRate, timestamp: now }
      return eurRate
    }
  } catch (error) {
    console.log("[v0] ExchangeRate-API also failed:", error)
  }

  console.log("[v0] Falling back to Fixer.io")
  try {
    const res = await retryWithBackoff(async () => {
      const response = await fetchFn("http://data.fixer.io/api/latest?access_key=demo&base=USD&symbols=EUR", {
        method: "GET",
        headers: {
          Accept: "application/json",
          "User-Agent": "Mozilla/5.0 (compatible; Exchange Rate Bot)",
        },
        cache: "no-store",
      })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      return response
    })

    const j = await res.json().catch(() => null)
    const eurRate = j?.rates?.EUR
    console.log("[v0] Fixer.io response:", j)

    if (typeof eurRate === "number" && isFinite(eurRate) && eurRate > 0) {
      console.log("[v0] Got valid USD/EUR rate from Fixer.io:", eurRate)
      cache = { value: eurRate, timestamp: now }
      return eurRate
    }
  } catch (error) {
    console.log("[v0] Fixer.io also failed:", error)
  }

  console.log("[v0] All exchange rate APIs failed")
  return null
}
