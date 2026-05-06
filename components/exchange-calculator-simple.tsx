"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ArrowUpDown, Calculator } from "lucide-react"

interface ExchangeCalculatorSimpleProps {
  onOrderCreate: () => void
}

interface MarginTier {
  min: number
  max: number | null | undefined
  margin: number
}

const currencies = [
  { value: "USDT", label: "USDT" },
  { value: "EUR", label: "EUR" },
  { value: "RUB", label: "RUB" },
]

const exchangeDirections = [
  {
    id: "usdt-eur",
    from: "USDT",
    to: "EUR",
    name: "USDT → EUR",
    banks: [],
  },
  {
    id: "eur-usdt",
    from: "EUR",
    to: "USDT",
    name: "EUR → USDT",
    banks: [],
  },
  {
    id: "rub-eur",
    from: "RUB",
    to: "EUR",
    name: "RUB → EUR",
    banks: ["Сбербанк", "Райффайзен", "Тинькофф", "Наличные рубли", "Другие банки"],
  },
  {
    id: "eur-rub",
    from: "EUR",
    to: "RUB",
    name: "EUR → RUB",
    banks: ["Сбербанк", "Райффайзен", "Тинькофф", "Наличные рубли", "Другие банки"],
  },
  {
    id: "usdt-rub",
    from: "USDT",
    to: "RUB",
    name: "USDT → RUB",
    banks: [],
  },
  {
    id: "rub-usdt",
    from: "RUB",
    to: "USDT",
    name: "RUB → USDT",
    banks: [],
  },
]

const mockRates = {
  "rub-eur": 0.0105,
  "eur-rub": 94.5,
  "usdt-eur": 0.92,
  "eur-usdt": 1.087,
  "usdt-rub": 87.2,
  "rub-usdt": 0.0115,
}

export function ExchangeCalculatorSimple({ onOrderCreate }: ExchangeCalculatorSimpleProps) {
  const [fromCurrency, setFromCurrency] = useState("USDT")
  const [toCurrency, setToCurrency] = useState("EUR")
  const [fromBank, setFromBank] = useState("")
  const [toBank, setToBank] = useState("")
  const [amount, setAmount] = useState("1")
  const [toAmount, setToAmount] = useState("")
  const [telegramUsername, setTelegramUsername] = useState<string>("")
  const [telegramUserId, setTelegramUserId] = useState<number | null>(null)
  const [contactInput, setContactInput] = useState<string>("")
  const [lastEdited, setLastEdited] = useState<"from" | "to">("from")
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [realUsdEurRate, setRealUsdEurRate] = useState<number | null>(null)
  const [rubRate, setRubRate] = useState<number | null>(null)
  const [usdtEurPercentage, setUsdtEurPercentage] = useState<number>(0)
  const [rubEurTiers, setRubEurTiers] = useState<MarginTier[]>([])
  const [usdtEurTiers, setUsdtEurTiers] = useState<MarginTier[]>([])
  const [sendingOrder, setSendingOrder] = useState(false)
  const [orderError, setOrderError] = useState<string | null>(null)
  const [isTelegramWebApp, setIsTelegramWebApp] = useState(false)

  useEffect(() => {
    const fetchUsdEurRate = async () => {
      try {
        const response = await fetch("https://api.binance.com/api/v3/ticker/price?symbol=EURUSDT")
        const data = await response.json()

        if (data.price) {
          const eurUsdtRate = Number.parseFloat(data.price)
          const usdEurRate = 1 / eurUsdtRate
          setRealUsdEurRate(usdEurRate)
        } else {
          setRealUsdEurRate(0.92)
        }
      } catch (error) {
        setRealUsdEurRate(0.92)
      }
    }

    fetchUsdEurRate()
    const interval = setInterval(fetchUsdEurRate, 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const fetchRubRate = async () => {
      try {
        const timestamp = Date.now()
        const response = await fetch(`/api/rub-rate?_=${timestamp}`, {
          cache: "no-store",
        })
        const data = await response.json()

        if (data.rubRate) {
          setRubRate(data.rubRate)
        }

        if (data.usdtEurPercentage !== undefined && data.usdtEurPercentage !== null) {
          setUsdtEurPercentage(data.usdtEurPercentage)
        }

        if (data.rubEurTiers && Array.isArray(data.rubEurTiers)) {
          setRubEurTiers(data.rubEurTiers)
        }

        if (data.usdtEurTiers && Array.isArray(data.usdtEurTiers)) {
          setUsdtEurTiers(data.usdtEurTiers)
        }
      } catch (error) {
        setRubRate(null)
      }
    }

    fetchRubRate()
    const interval = setInterval(fetchRubRate, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).Telegram?.WebApp) {
      const tg = (window as any).Telegram.WebApp
      tg.ready()

      setIsTelegramWebApp(true)

      const user = tg.initDataUnsafe?.user
      if (user) {
        const username = user.username || ""
        setTelegramUsername(username)
        setTelegramUserId(user.id)
      }
    }
  }, [])

  const currentDirection = exchangeDirections.find((d) => d.from === fromCurrency && d.to === toCurrency)
  const selectedDirection = currentDirection?.id || ""

  const getRubMargin = (eurAmount: number): number => {
    if (rubEurTiers.length === 0) {
      return eurAmount <= 50 ? 0.015 : 0.01
    }

    for (const tier of rubEurTiers) {
      if (tier.max === null || tier.max === Number.POSITIVE_INFINITY) {
        if (eurAmount >= tier.min) {
          return Math.abs(tier.margin) / 100
        }
      } else if (eurAmount >= tier.min && eurAmount < tier.max) {
        return Math.abs(tier.margin) / 100
      }
    }

    const lastTier = rubEurTiers[rubEurTiers.length - 1]
    return Math.abs(lastTier.margin) / 100
  }

  const getUsdtMargin = (eurAmount: number): number => {
    if (usdtEurTiers.length === 0) {
      return eurAmount <= 5000 ? 0.015 : 0.01
    }

    for (const tier of usdtEurTiers) {
      if (tier.max === null || tier.max === Number.POSITIVE_INFINITY) {
        if (eurAmount >= tier.min) {
          return Math.abs(tier.margin) / 100
        }
      } else if (eurAmount >= tier.min && eurAmount < tier.max) {
        return Math.abs(tier.margin) / 100
      }
    }

    const lastTier = usdtEurTiers[usdtEurTiers.length - 1]
    return Math.abs(lastTier.margin) / 100
  }

  const getExchangeRate = () => {
    if (!selectedDirection) return 0

    if (selectedDirection === "eur-usdt" && realUsdEurRate) {
      const baseRate = 1 / realUsdEurRate
      const buybackRate = baseRate * (1 + usdtEurPercentage / 100)
      const eurAmount = Number.parseFloat(amount) || 0
      const margin = getUsdtMargin(eurAmount)
      const finalRate = buybackRate * (1 - margin)
      return finalRate
    } else if (selectedDirection === "usdt-eur" && realUsdEurRate) {
      const baseRate = realUsdEurRate
      const buybackRate = baseRate * (1 + usdtEurPercentage / 100)
      const usdtAmount = Number.parseFloat(amount) || 0
      const eurAmount = usdtAmount * buybackRate
      const margin = getUsdtMargin(eurAmount)
      const finalRate = buybackRate * (1 - margin)
      return finalRate
    }

    if ((selectedDirection === "rub-eur" || selectedDirection === "eur-rub") && rubRate && realUsdEurRate) {
      const baseUsdtEurRate = realUsdEurRate
      const buybackUsdtEurRate = baseUsdtEurRate * (1 + usdtEurPercentage / 100)

      if (selectedDirection === "rub-eur") {
        const rubAmount = Number.parseFloat(amount) || 0
        const usdtAmount = rubAmount / rubRate
        const eurAmountBeforeMargin = usdtAmount * buybackUsdtEurRate
        const margin = getRubMargin(eurAmountBeforeMargin)
        const finalUsdtEurRate = buybackUsdtEurRate * (1 - margin)
        const finalRate = finalUsdtEurRate / rubRate
        return finalRate
      } else {
        const eurAmount = Number.parseFloat(amount) || 0
        const margin = getRubMargin(eurAmount)
        const finalUsdtEurRate = buybackUsdtEurRate * (1 - margin)
        const eurToUsdtRate = 1 / finalUsdtEurRate
        const finalRate = eurToUsdtRate * rubRate
        return finalRate
      }
    }

    if (selectedDirection === "rub-eur" || selectedDirection === "eur-rub") {
      return 0
    }

    return mockRates[selectedDirection as keyof typeof mockRates] || 0
  }

  const rate = getExchangeRate()

  const getPerUnitRateDisplay = () => {
    if (!selectedDirection || rate === 0) return null

    if (selectedDirection === "rub-eur") {
      const eurPerRub = rate
      const rubPerEur = 1 / eurPerRub
      return `1 EUR = ${rubPerEur.toFixed(2)} RUB`
    } else if (selectedDirection === "eur-rub") {
      const rubPerEur = rate
      return `1 EUR = ${rubPerEur.toFixed(2)} RUB`
    }

    if (selectedDirection === "usdt-eur") {
      return `1 USDT = ${rate.toFixed(4)} EUR`
    } else if (selectedDirection === "eur-usdt") {
      return `1 EUR = ${rate.toFixed(4)} USDT`
    }

    return null
  }

  useEffect(() => {
    if (lastEdited === "from" && amount) {
      const calculated =
        rate > 0
          ? (Number.parseFloat(amount) * rate).toFixed(
              selectedDirection === "usdt-eur" || selectedDirection === "eur-usdt" ? 4 : 2,
            )
          : "0"
      setToAmount(calculated)
    } else if (lastEdited === "to" && toAmount) {
      const calculated =
        rate > 0
          ? (Number.parseFloat(toAmount) / rate).toFixed(
              selectedDirection === "usdt-eur" || selectedDirection === "eur-usdt" ? 4 : 2,
            )
          : "0"
      setAmount(calculated)
    }
  }, [amount, toAmount, rate, lastEdited, selectedDirection])

  const calculatedAmount = toAmount

  const getBanksForCurrency = (currency: string) => {
    if (currency === "RUB") {
      return ["Сбербанк", "Райффайзен", "Тинькофф", "Наличные рубли", "Другие банки"]
    }
    return []
  }

  const handleSwap = () => {
    const tempFrom = fromCurrency
    const tempFromBank = fromBank
    setFromCurrency(toCurrency)
    setToCurrency(tempFrom)
    setFromBank(toBank)
    setToBank(tempFromBank)
    setLastEdited("from")
  }

  const handleExchange = () => {
    if (fromCurrency && toCurrency && amount) {
      setShowConfirmation(true)
    }
  }

  const handleConfirmOrder = async () => {
    const finalContact = telegramUsername || contactInput

    if (!finalContact) {
      setOrderError("Пожалуйста, введите контакт для связи")
      return
    }

    setSendingOrder(true)
    setOrderError(null)

    try {
      const telegramResponse = await fetch("/api/telegram/send-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fromCurrency,
          toCurrency,
          fromAmount: amount,
          toAmount: calculatedAmount,
          fromBank: fromBank || null,
          toBank: toBank || null,
          rate: rate.toFixed(6),
          telegramUsername: finalContact,
          telegramUserId: telegramUserId,
          isTelegramWebApp: isTelegramWebApp,
        }),
      })

      const telegramData = await telegramResponse.json()

      if (!telegramResponse.ok) {
        setOrderError(telegramData.error || "Ошибка при отправке заявки")
        return
      }

      const sheetsResponse = await fetch("/api/google-sheets/save-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fromCurrency,
          toCurrency,
          fromAmount: amount,
          toAmount: calculatedAmount,
          fromBank: fromBank || "N/A",
          toBank: toBank || "N/A",
          rate: rate.toFixed(6),
          timestamp: new Date().toISOString(),
          telegramUsername: finalContact,
        }),
      })

      if (!sheetsResponse.ok) {
        console.log("[v0] Failed to save order to Google Sheets, but continuing...")
      }

      alert("Спасибо за вашу заявку! С вами свяжется оператор в ближайшее время.")

      onOrderCreate()
      setShowConfirmation(false)
      setAmount("")
      setToAmount("")
      setFromCurrency("")
      setToCurrency("")
      setFromBank("")
      setToBank("")
      setTelegramUsername("")
      setContactInput("")
    } catch (error) {
      setOrderError("Ошибка сети при отправке заявки")
    } finally {
      setSendingOrder(false)
    }
  }

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setAmount(value)
      setLastEdited("from")
    }
  }

  const handleToAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setToAmount(value)
      setLastEdited("to")
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-3 px-4">
        <Calculator className="w-6 h-6 text-green-400" />
        <h2 className="text-xl font-bold text-white">Exchange Calculator</h2>
      </div>

      <div className="glass-card rounded-2xl p-6 mx-4">
        <div className="space-y-1">
          <div>
            <label className="text-gray-300 text-sm font-medium mb-1.5 block text-center">From</label>
            <div className="flex items-center justify-center gap-3">
              <Input
                type="number"
                placeholder="1"
                value={amount}
                onChange={handleAmountChange}
                className="bg-black/50 border-gray-600 text-white text-lg h-9 text-center flex-1 max-w-32"
              />
              <Select value={fromCurrency} onValueChange={setFromCurrency}>
                <SelectTrigger className="bg-black/50 border-gray-600 text-white h-12 flex-1 max-w-32">
                  <SelectValue placeholder="USDT" />
                </SelectTrigger>
                <SelectContent className="bg-black border-gray-600">
                  {currencies.map((currency) => (
                    <SelectItem key={currency.value} value={currency.value} className="text-white">
                      {currency.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {fromCurrency === "RUB" && (
              <div className="mt-3">
                <Select value={fromBank} onValueChange={setFromBank}>
                  <SelectTrigger className="bg-black/50 border-gray-600 text-white h-12 max-w-64 mx-auto">
                    <SelectValue placeholder="Выберите банк" />
                  </SelectTrigger>
                  <SelectContent className="bg-black border-gray-600">
                    {getBanksForCurrency(fromCurrency).map((bank) => (
                      <SelectItem key={bank} value={bank} className="text-white">
                        {bank}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex justify-center">
            <Button
              variant="outline"
              size="sm"
              className="w-8 h-8 rounded-full bg-black/50 border-gray-600 hover:bg-gray-700 p-0"
              onClick={handleSwap}
              disabled={!fromCurrency || !toCurrency}
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-white" />
            </Button>
          </div>

          <div>
            <label className="text-gray-300 text-sm font-medium mb-1.5 block text-center">To</label>
            <div className="flex items-center justify-center gap-3">
              <Input
                type="number"
                placeholder="0"
                value={toAmount}
                onChange={handleToAmountChange}
                className="bg-black/50 border-gray-600 text-white text-lg h-9 text-center flex-1 max-w-32"
              />
              <Select value={toCurrency} onValueChange={setToCurrency}>
                <SelectTrigger className="bg-black/50 border-gray-600 text-white h-12 flex-1 max-w-32">
                  <SelectValue placeholder="EUR" />
                </SelectTrigger>
                <SelectContent className="bg-black border-gray-600">
                  {currencies.map((currency) => (
                    <SelectItem key={currency.value} value={currency.value} className="text-white">
                      {currency.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {toCurrency === "RUB" && (
              <div className="mt-3">
                <Select value={toBank} onValueChange={setToBank}>
                  <SelectTrigger className="bg-black/50 border-gray-600 text-white h-12 max-w-64 mx-auto">
                    <SelectValue placeholder="Выберите банк" />
                  </SelectTrigger>
                  <SelectContent className="bg-black border-gray-600">
                    {getBanksForCurrency(toCurrency).map((bank) => (
                      <SelectItem key={bank} value={bank} className="text-white">
                        {bank}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-gray-700">
            {telegramUsername && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Telegram:</span>
                <span className="text-white font-medium">{telegramUsername}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Направление:</span>
              <span className="text-white font-medium">{currentDirection?.name}</span>
            </div>
            {fromBank && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Банк отправителя:</span>
                <span className="text-white font-medium">{fromBank}</span>
              </div>
            )}
            {toBank && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Банк получателя:</span>
                <span className="text-white font-medium">{toBank}</span>
              </div>
            )}
            {getPerUnitRateDisplay() && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Курс:</span>
                <span className="text-green-400 font-medium">{getPerUnitRateDisplay()}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Отдаете:</span>
              <span className="text-white font-medium">
                {amount} {fromCurrency}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Получаете:</span>
              <span className="text-green-400 font-medium">
                {calculatedAmount} {toCurrency}
              </span>
            </div>
          </div>
        </div>

        <Button
          onClick={handleExchange}
          className="w-full mt-4 bg-green-500 hover:bg-green-600 text-black font-semibold text-lg"
          disabled={!fromCurrency || !toCurrency || !amount || Number.parseFloat(amount) <= 0}
        >
          Отправить заявку
        </Button>
      </div>

      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent className="bg-black/90 border-green-500/30">
          <DialogHeader>
            <DialogTitle className="text-white">Подтверждение заявки</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="glass-card p-4 rounded-lg space-y-2">
              {telegramUsername ? (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Telegram:</span>
                  <span className="text-white font-medium">{telegramUsername}</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-gray-400 text-sm">Контакт для связи:</label>
                  <Input
                    type="text"
                    placeholder="@username или номер телефона"
                    value={contactInput}
                    onChange={(e) => setContactInput(e.target.value)}
                    className="bg-black/50 border-gray-600 text-white"
                  />
                  <p className="text-xs text-gray-500">Введите ваш Telegram username или номер телефона</p>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Направление:</span>
                <span className="text-white font-medium">{currentDirection?.name}</span>
              </div>
              {fromBank && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Банк отправителя:</span>
                  <span className="text-white font-medium">{fromBank}</span>
                </div>
              )}
              {toBank && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Банк получателя:</span>
                  <span className="text-white font-medium">{toBank}</span>
                </div>
              )}
              {getPerUnitRateDisplay() && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Курс:</span>
                  <span className="text-green-400 font-medium">{getPerUnitRateDisplay()}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Отдаете:</span>
                <span className="text-white font-medium">
                  {amount} {fromCurrency}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Получаете:</span>
                <span className="text-green-400 font-medium">
                  {calculatedAmount} {toCurrency}
                </span>
              </div>
            </div>

            {orderError && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
                {orderError}
              </div>
            )}

            <Button
              onClick={handleConfirmOrder}
              className="w-full bg-green-500 hover:bg-green-600 text-black"
              disabled={sendingOrder || (!telegramUsername && !contactInput)}
            >
              {sendingOrder ? "Отправка..." : "Создать заказ"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
