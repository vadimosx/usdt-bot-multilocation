"use client"

import { useState } from "react"
import { ExchangeCalculatorUnified } from "@/components/exchange-calculator-unified"
import { Calculator } from "lucide-react"

export default function CalcPage() {
  const [orderCount, setOrderCount] = useState(0)

  return (
    <div className="min-h-screen serbia-bg">
      <div className="max-w-md mx-auto lg:max-w-sm">
        <div className="flex justify-center items-center p-6">
          <div className="flex items-center gap-3">
            <Calculator className="w-8 h-8 text-green-400" />
            <h1 className="text-2xl font-bold text-white">Калькулятор обмена</h1>
          </div>
        </div>

        <div className="px-4 pb-6">
          <ExchangeCalculatorUnified onOrderCreate={() => setOrderCount((prev) => prev + 1)} showTechnicalInfo={true} />
        </div>
      </div>
    </div>
  )
}
