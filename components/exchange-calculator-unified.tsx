"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ArrowUpDown, Calculator, Share2 } from "lucide-react"
import { activeLocation } from "@/config/locations"

interface ExchangeCalculatorUnifiedProps {
  onOrderCreate: () => void
  showTechnicalInfo?: boolean
  selectedCity?: string
}

interface MarginTier {
  min: number
  max: number | null | undefined
  margin: number
}

const currencies = activeLocation.currencies
const exchangeDirections = activeLocation.exchangeDirections

export function ExchangeCalculatorUnified({
  onOrderCreate,
  showTechnicalInfo = false,
  selectedCity,
}: ExchangeCalculatorUnifiedProps) {
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
  const [realUsdEurRate, setRealUsdEurRate] = useState<number>(0)
  const [rubRate, setRubRate] = useState<number | null>(null)
  const [rsdRate, setRsdRate] = useState<number | null>(null) // Added RSD rate state
  const [usdtEurPercentage, setUsdtEurPercentage] = useState<number>(0)
  const [rubEurTiers, setRubEurTiers] = useState<MarginTier[]>([])
  const [usdtEurTiers, setUsdtEurTiers] = useState<MarginTier[]>([])
  const [sendingOrder, setSendingOrder] = useState(false)
  const [orderError, setOrderError] = useState<string | null>(null)
  const [sharingRate, setSharingRate] = useState(false)
  const [shareSuccess, setShareSuccess] = useState(false)
  const [isTelegramWebApp, setIsTelegramWebApp] = useState(false)
  const [rateLoading, setRateLoading] = useState(false)
  const [rateSource, setRateSource] = useState<"binance" | "fix" | "last-binance" | null>(null) // Removed "fallback", added "last-binance"
  const [isRateCached, setIsRateCached] = useState(false)

  useEffect(() => {
    const fetchUsdEurRate = async () => {
      setRateLoading(true)
      try {
        const sheetResponse = await fetch(`/api/rub-rate?_=${Date.now()}`, {
          cache: "no-store",
        })
        const sheetData = await sheetResponse.json()

        if (sheetData.fixUsdEurRate && sheetData.fixUsdEurRate > 0) {
          setRealUsdEurRate(sheetData.fixUsdEurRate)
          setRateSource("fix")
          console.log(`[v0] Using FIX rate from D2: ${sheetData.fixUsdEurRate.toFixed(6)} USD/EUR`)
          setRateLoading(false)
          return
        }

        // Check cache first - if less than 5 minutes, use cached rate
        const lastBinanceRate = typeof window !== "undefined" ? localStorage.getItem("lastBinanceRate") : null
        const lastBinanceTime = typeof window !== "undefined" ? localStorage.getItem("lastBinanceTime") : null

        if (lastBinanceRate && lastBinanceTime) {
          const timeElapsed = Date.now() - Number.parseInt(lastBinanceTime)
          const minutesElapsed = Math.floor(timeElapsed / 1000 / 60)

          // Use cached rate if less than 5 minutes old
          if (timeElapsed < 5 * 60 * 1000) {
            const rate = Number.parseFloat(lastBinanceRate)
            setRealUsdEurRate(rate)
            setRateSource("binance")
            setIsRateCached(true)

            console.log(`[v0] Using cached Binance rate (${minutesElapsed} min old): ${rate.toFixed(6)} USD/EUR`)
            setRateLoading(false)
            return
          }
        }

        // If no FIX rate in D2, fetch from Binance
        console.log("[v0] No FIX rate in D2, fetching from Binance...")

        try {
          const response = await fetch("https://api.binance.com/api/v3/ticker/price?symbol=EURUSDT")

          if (!response.ok) {
            console.log(`[v0] Binance API returned status ${response.status}`)
            throw new Error(`Binance API error: ${response.status}`)
          }

          const data = await response.json()

          if (data.price) {
            const eurUsdtRate = Number.parseFloat(data.price)
            // D2 contains USDT/EUR, so we use eurUsdtRate directly as USDT/EUR
            const usdtEurRate = 1 / eurUsdtRate
            setRealUsdEurRate(usdtEurRate)
            setRateSource("binance")
            setIsRateCached(false)

            if (typeof window !== "undefined") {
              localStorage.setItem("lastBinanceRate", usdtEurRate.toString())
              localStorage.setItem("lastBinanceTime", Date.now().toString())
            }

            console.log(
              `[v0] ✓ Successfully fetched from Binance: ${usdtEurRate.toFixed(6)} USDT/EUR (EUR/USDT was ${eurUsdtRate})`,
            )
            setRateLoading(false)
            return
          }
        } catch (binanceError) {
          console.log("[v0] Binance API failed, attempting to use cached rate")

          if (lastBinanceRate) {
            const rate = Number.parseFloat(lastBinanceRate)
            const timeAgo = lastBinanceTime
              ? Math.floor((Date.now() - Number.parseInt(lastBinanceTime)) / 1000 / 60)
              : 0
            setRealUsdEurRate(rate)
            setRateSource("binance")
            setIsRateCached(true)
            console.log(`[v0] ✓ Using cached Binance rate from ${timeAgo} minutes ago: ${rate.toFixed(6)} USDT/EUR`)
            setRateLoading(false)
            return
          }

          console.error("[v0] ⚠️ Binance unavailable and no cached rate, using fallback 0.86")
          setRealUsdEurRate(0.86) // Fallback USDT/EUR rate
          setRateSource("binance")
          setIsRateCached(true)
          setRateLoading(false)
          return
        }
      } catch (error) {
        console.error("[v0] ⚠️ Critical error in fetchUsdEurRate:", error)
        setRealUsdEurRate(0.86)
        setRateSource("binance")
        setIsRateCached(true)
      } finally {
        setRateLoading(false)
      }
    }

    fetchUsdEurRate()
    // Check Binance cache every 5 minutes instead of 30 seconds
    const interval = setInterval(fetchUsdEurRate, 5 * 60 * 1000) // 5 minutes
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const fetchRates = async () => {
      try {
        const timestamp = Date.now()
        const response = await fetch(`/api/rub-rate?_=${timestamp}`, {
          cache: "no-store",
        })
        const data = await response.json()

        if (data.rubRate) setRubRate(data.rubRate)
        if (data.rsdRate) setRsdRate(data.rsdRate) // Load RSD rate
        if (data.usdtEurPercentage !== undefined) setUsdtEurPercentage(data.usdtEurPercentage)
        if (data.rubEurTiers) setRubEurTiers(data.rubEurTiers)
        if (data.usdtEurTiers) setUsdtEurTiers(data.usdtEurTiers)
      } catch (error) {
        console.error("[v0] Error fetching rates:", error)
      }
    }

    fetchRates()
    const interval = setInterval(fetchRates, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).Telegram?.WebApp) {
      const tg = (window as any).Telegram.WebApp
      tg.ready()
      setIsTelegramWebApp(true)

      const user = tg.initDataUnsafe?.user
      if (user) {
        setTelegramUsername(user.username || "")
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

  // Unified helper function to convert USDT to EUR (used by all directions)
  // Returns EUR amount for given USDT amount with margin applied
  const convertUsdtToEur = (usdtAmount: number): number => {
    const baseRate = realUsdEurRate // USDT/EUR (e.g., 0.86)
    // For Binance mode: apply buyback B2 to rate
    const effectiveRate = rateSource !== "fix" ? baseRate * (1 + usdtEurPercentage / 100) : baseRate
    const eurAmountBeforeMargin = usdtAmount * effectiveRate
    const margin = getUsdtMargin(eurAmountBeforeMargin)
    return eurAmountBeforeMargin * (1 - margin)
  }

  // Unified helper function to convert EUR to USDT (used by all directions)
  // Returns USDT amount for given EUR amount with margin applied
  const convertEurToUsdt = (eurAmount: number): number => {
    const baseRate = realUsdEurRate // USDT/EUR (e.g., 0.86)
    // For Binance mode: apply buyback B2 to rate
    const effectiveRate = rateSource !== "fix" ? baseRate * (1 + usdtEurPercentage / 100) : baseRate
    const usdtAmountBeforeMargin = eurAmount / effectiveRate
    const margin = getUsdtMargin(eurAmount) // Margin based on EUR amount
    return usdtAmountBeforeMargin * (1 - margin)
  }

  const getExchangeRate = (selectedDirection: string, amount: string): number | null => {
    if (!realUsdEurRate || !rubRate) return null

    // For Binance mode, add buyback percentage
    const shouldAddBuyback = rateSource !== "fix"

    if (selectedDirection === "eur-usdt" && realUsdEurRate) {
      // EUR → USDT using unified helper
      const eurAmount = Number.parseFloat(amount) || 0
      const usdtAmount = convertEurToUsdt(eurAmount)
      return usdtAmount / eurAmount
    } else if (selectedDirection === "usdt-eur" && realUsdEurRate) {
      const usdtAmount = Number.parseFloat(amount) || 0
      const eurAmount = convertUsdtToEur(usdtAmount)
      return eurAmount / usdtAmount
    } else if ((selectedDirection === "rub-eur" || selectedDirection === "eur-rub") && realUsdEurRate && rubRate) {
      if (selectedDirection === "rub-eur") {
        // RUB → EUR: RUB / rubRate = USDT, then USDT → EUR
        const rubAmount = Number.parseFloat(amount) || 0
        const usdtAmount = rubAmount / rubRate
        const eurAmount = convertUsdtToEur(usdtAmount)
        return eurAmount / rubAmount
      } else {
        // EUR → RUB: EUR → USDT, then USDT * rubRate = RUB
        const eurAmount = Number.parseFloat(amount) || 0
        const usdtAmount = convertEurToUsdt(eurAmount)
        const rubAmount = usdtAmount * rubRate
        return rubAmount / eurAmount
      }
    } else if ((selectedDirection === "rsd-eur" || selectedDirection === "eur-rsd") && realUsdEurRate && rsdRate) {
      if (selectedDirection === "rsd-eur") {
        // RSD → EUR: RSD / rsdRate = EUR (direct conversion, no margin needed)
        const rsdAmount = Number.parseFloat(amount) || 0
        const eurAmount = rsdAmount / rsdRate
        return eurAmount / rsdAmount
      } else {
        // EUR → RSD: EUR * rsdRate = RSD (direct conversion, no margin needed)
        const eurAmount = Number.parseFloat(amount) || 0
        const rsdAmount = eurAmount * rsdRate
        return rsdAmount / eurAmount
      }
    } else if (selectedDirection === "usdt-rub" && rubRate) {
      // USDT → RUB: USDT * rubRate, then apply margin
      const usdtAmount = Number.parseFloat(amount) || 0
      const eurEquivalent = usdtAmount * realUsdEurRate
      const margin = getRubMargin(eurEquivalent)
      return rubRate * (1 - margin)
    } else if (selectedDirection === "rub-usdt" && rubRate && realUsdEurRate) {
      // RUB → USDT: RUB / rubRate, then apply margin
      const rubAmount = Number.parseFloat(amount) || 0
      const usdtAmountBeforeMargin = rubAmount / rubRate
      const eurEquivalent = usdtAmountBeforeMargin * realUsdEurRate
      const margin = getUsdtMargin(eurEquivalent)
      return (1 / rubRate) * (1 - margin)
    } else if (selectedDirection === "rsd-usdt" && rsdRate && realUsdEurRate) {
      // RSD → USDT: RSD / rsdRate = EUR, then EUR → USDT
      const rsdAmount = Number.parseFloat(amount) || 0
      const eurAmount = rsdAmount / rsdRate
      const usdtAmount = convertEurToUsdt(eurAmount)
      return usdtAmount / rsdAmount
    } else if (selectedDirection === "usdt-rsd" && rsdRate && realUsdEurRate) {
      // USDT → RSD: USDT → EUR, then EUR * rsdRate = RSD
      const usdtAmount = Number.parseFloat(amount) || 0
      const eurAmount = convertUsdtToEur(usdtAmount)
      const rsdAmount = Math.floor(eurAmount * rsdRate)
      return rsdAmount / usdtAmount
    } else if (selectedDirection === "rub-rsd" && rsdRate && rubRate && realUsdEurRate) {
      // RUB → RSD: RUB / rubRate = USDT, USDT → EUR (with margin), EUR * rsdRate = RSD
      const rubAmount = Number.parseFloat(amount) || 0
      const usdtAmount = rubAmount / rubRate
      const eurAmount = convertUsdtToEur(usdtAmount)
      const rsdAmount = Math.floor(eurAmount * rsdRate)
      
      console.log("[v0] RUB→RSD:", rubAmount, "RUB /", rubRate, "=", usdtAmount.toFixed(2), "USDT →", eurAmount.toFixed(2), "EUR *", rsdRate, "=", rsdAmount, "RSD")
      
      return rsdAmount / rubAmount
    } else if (selectedDirection === "rsd-rub" && rsdRate && rubRate && realUsdEurRate) {
      // RSD → RUB: RSD / rsdRate = EUR, EUR → USDT, USDT * rubRate = RUB
      const rsdAmountInput = Number.parseFloat(amount) || 0
      const eurAmount = rsdAmountInput / rsdRate
      const usdtAmount = convertEurToUsdt(eurAmount)
      const rubAmount = usdtAmount * rubRate
      return rubAmount / rsdAmountInput
    }

    return null
  }

  const rateRefAmount = amount && Number.parseFloat(amount) > 0 ? amount : "1000"
  const rate = getExchangeRate(selectedDirection, rateRefAmount)

  const getPerUnitRateDisplay = () => {
    if (!selectedDirection || rate === null) return null

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

    if (selectedDirection === "usdt-rub") {
      return `1 USDT = ${rate.toFixed(2)} RUB`
    } else if (selectedDirection === "rub-usdt") {
      return `1 RUB = ${rate.toFixed(4)} USDT`
    }

    if (selectedDirection === "usdt-rsd") {
      return `1 USDT = ${rate.toFixed(2)} RSD`
    } else if (selectedDirection === "rsd-usdt") {
      return `1 RSD = ${rate.toFixed(4)} USDT`
    } else if (selectedDirection === "rub-rsd") {
      return `1 RUB = ${rate.toFixed(2)} RSD`
    } else if (selectedDirection === "rsd-rub") {
      return `1 RSD = ${rate.toFixed(2)} RUB`
    }

    return null
  }

  useEffect(() => {
    if (lastEdited === "from" && amount) {
      const calculated =
        rate !== null
          ? (Number.parseFloat(amount) * rate).toFixed(
              selectedDirection === "usdt-eur" || selectedDirection === "eur-usdt" || selectedDirection === "rsd-usdt"
                ? 4
                : 2,
            )
          : "0"
      setToAmount(calculated)
    } else if (lastEdited === "to" && toAmount) {
      const calculated =
        rate !== null
          ? (Number.parseFloat(toAmount) / rate).toFixed(
              selectedDirection === "usdt-eur" || selectedDirection === "eur-usdt" || selectedDirection === "rsd-usdt"
                ? 4
                : 2,
            )
          : "0"
      setAmount(calculated)
    }
  }, [amount, toAmount, rate, lastEdited, selectedDirection])

  const getBanksForCurrency = (currency: string) => {
    const direction = exchangeDirections.find((d) => d.from === currency || d.to === currency)
    return direction?.banks ?? []
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

  const handleShareRate = async () => {
    if (!fromCurrency || !toCurrency || !amount || Number.parseFloat(amount) <= 0) return

    setSharingRate(true)
    setShareSuccess(false)

    try {
      const response = await fetch("/api/telegram/share-rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromCurrency,
          toCurrency,
          fromAmount: amount,
          toAmount,
          rate: rate !== null ? rate.toFixed(6) : "0",
          rateDisplay: getPerUnitRateDisplay(),
          telegramUserId,
        }),
      })

      if (response.ok) {
        setShareSuccess(true)
        setTimeout(() => setShareSuccess(false), 3000)
      }
    } catch {
      // silent fail
    } finally {
      setSharingRate(false)
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
          toAmount: toAmount,
          fromBank: fromBank || null,
          toBank: toBank || null,
          rate: rate !== null ? rate.toFixed(6) : "0",
          telegramUsername: finalContact,
          telegramUserId: telegramUserId,
          isTelegramWebApp: isTelegramWebApp,
          city: selectedCity,
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
          toAmount: toAmount,
          fromBank: fromBank || "N/A",
          toBank: toBank || "N/A",
          rate: rate !== null ? rate.toFixed(6) : "0",
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
      <div className="flex items-center justify-center gap-2 px-4">
        <Calculator className="w-5 h-5 text-green-400" />
        <h2 className="text-lg font-bold text-white tracking-wide">Калькулятор обмена</h2>
      </div>

      {showTechnicalInfo && (
        <div className="mx-4 flex items-center gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-400">
          {rateSource === "fix"
            ? `🔒 FIX ${realUsdEurRate.toFixed(4)}`
            : `📊 Binance (${usdtEurPercentage > 0 ? "+" : ""}${usdtEurPercentage}%) ${realUsdEurRate.toFixed(4)}`}
        </div>
      )}

      <div className="glass-card rounded-2xl mx-4 overflow-hidden">

        {/* FROM block */}
        <div className="p-4 pb-3">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-2 font-medium">Отдаёте</p>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              placeholder="0"
              value={amount}
              onChange={handleAmountChange}
              className="bg-transparent border-none text-white text-4xl font-bold h-auto p-0 focus-visible:ring-0 focus-visible:ring-offset-0 w-0 flex-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <Select value={fromCurrency} onValueChange={setFromCurrency}>
              <SelectTrigger className="bg-white/10 border-none text-white font-bold h-10 w-24 rounded-xl shrink-0 text-base">
                <SelectValue placeholder="USDT" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700">
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
                <SelectTrigger className="bg-white/10 border-none text-white h-9 w-full rounded-xl text-sm">
                  <SelectValue placeholder="Выберите банк" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700">
                  {getBanksForCurrency(fromCurrency).map((bank) => (
                    <SelectItem key={bank} value={bank} className="text-white">{bank}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* SWAP divider */}
        <div className="relative flex items-center px-4">
          <div className="flex-1 h-px bg-gray-700/60" />
          <Button
            variant="outline"
            size="sm"
            className="mx-3 w-9 h-9 rounded-full bg-gray-800 border-gray-600 hover:bg-gray-700 hover:border-green-500 transition-colors p-0 shrink-0 z-10"
            onClick={handleSwap}
            disabled={!fromCurrency || !toCurrency}
          >
            <ArrowUpDown className="w-4 h-4 text-green-400" />
          </Button>
          <div className="flex-1 h-px bg-gray-700/60" />
        </div>

        {/* TO block */}
        <div className="p-4 pt-3">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-2 font-medium">Получаете</p>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              placeholder="0"
              value={toAmount}
              onChange={handleToAmountChange}
              className="bg-transparent border-none text-green-400 text-4xl font-bold h-auto p-0 focus-visible:ring-0 focus-visible:ring-offset-0 w-0 flex-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <Select value={toCurrency} onValueChange={setToCurrency}>
              <SelectTrigger className="bg-white/10 border-none text-white font-bold h-10 w-24 rounded-xl shrink-0 text-base">
                <SelectValue placeholder="EUR" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700">
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
                <SelectTrigger className="bg-white/10 border-none text-white h-9 w-full rounded-xl text-sm">
                  <SelectValue placeholder="Выберите банк" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700">
                  {getBanksForCurrency(toCurrency).map((bank) => (
                    <SelectItem key={bank} value={bank} className="text-white">{bank}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Rate info */}
        {getPerUnitRateDisplay() && (
          <div className="mx-4 mb-3 flex items-center justify-between rounded-xl bg-green-500/10 border border-green-500/20 px-3 py-2">
            <span className="text-xs text-gray-400">Курс</span>
            <span className="text-sm font-semibold text-green-400">{getPerUnitRateDisplay()}</span>
          </div>
        )}

        {showTechnicalInfo && (
          <div className="mx-4 mb-3 space-y-1 rounded-xl bg-white/5 px-3 py-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Откуп</span>
              <span className="text-yellow-400">{usdtEurPercentage > 0 ? "+" : ""}{usdtEurPercentage}%</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Маржа</span>
              <span className="text-yellow-400">
                {(() => {
                  const r = getExchangeRate(selectedDirection, amount)
                  const fromAmt = Number.parseFloat(amount) || 0
                  const toAmt = lastEdited === "from" ? fromAmt * r : Number.parseFloat(toAmount) || 0
                  const givingCurrency = lastEdited === "from" ? toCurrency : fromCurrency
                  if (givingCurrency === "RUB" || selectedDirection.includes("rub")) {
                    const eurEquivalent = givingCurrency === "RUB" && rubRate ? (toAmt / rubRate) * (realUsdEurRate || 1) : toAmt
                    return (getRubMargin(eurEquivalent) * 100).toFixed(1)
                  } else {
                    let eurEquivalent = toAmt
                    if (givingCurrency === "RSD" && rsdRate) eurEquivalent = toAmt / rsdRate
                    else if (givingCurrency === "USDT" && realUsdEurRate) eurEquivalent = toAmt * realUsdEurRate
                    return (getUsdtMargin(eurEquivalent) * 100).toFixed(1)
                  }
                })()}%
              </span>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="p-4 pt-0 space-y-2">
          <Button
            onClick={handleExchange}
            className="w-full h-12 bg-green-500 hover:bg-green-400 text-black font-bold text-base rounded-xl transition-colors"
            disabled={!fromCurrency || !toCurrency || !amount || Number.parseFloat(amount) <= 0}
          >
            Отправить заявку
          </Button>
          <Button
            onClick={handleShareRate}
            className="w-full h-10 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 font-medium text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
            disabled={!fromCurrency || !toCurrency || !amount || Number.parseFloat(amount) <= 0 || sharingRate}
          >
            {shareSuccess
              ? <><span className="text-green-400">✓</span> Курс отправлен в бот</>
              : sharingRate
              ? "Отправка..."
              : <><Share2 className="w-4 h-4" /> Поделиться курсом</>
            }
          </Button>
        </div>
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
                  <span className="text-white">{telegramUsername}</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-sm text-gray-400">Контакт для связи:</label>
                  <Input
                    type="text"
                    placeholder="Введите Telegram username или телефон"
                    value={contactInput}
                    onChange={(e) => setContactInput(e.target.value)}
                    className="bg-black/50 border-gray-600 text-white"
                  />
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Направление:</span>
                <span className="text-white">{currentDirection?.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Отдаете:</span>
                <span className="text-white">
                  {amount} {fromCurrency}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Получаете:</span>
                <span className="text-green-400 font-medium">
                  {toAmount} {toCurrency}
                </span>
              </div>
              {getPerUnitRateDisplay() && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Курс:</span>
                  <span className="text-green-400">{getPerUnitRateDisplay()}</span>
                </div>
              )}
            </div>

            {orderError && (
              <div className="text-red-400 text-sm bg-red-500/10 p-3 rounded-lg border border-red-500/30">
                {orderError}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={() => setShowConfirmation(false)}
                variant="outline"
                className="flex-1 border-gray-600 text-white hover:bg-gray-800"
                disabled={sendingOrder}
              >
                Отмена
              </Button>
              <Button
                onClick={handleConfirmOrder}
                className="flex-1 bg-green-500 hover:bg-green-600 text-black font-semibold"
                disabled={sendingOrder}
              >
                {sendingOrder ? "Отправка..." : "Подтвердить"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
