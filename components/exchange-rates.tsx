"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown } from "lucide-react"

const rates = [
  { pair: "RUB/EUR", rate: 0.0105, change: +0.0002, trend: "up" },
  { pair: "EUR/RUB", rate: 94.5, change: -1.2, trend: "down" },
  { pair: "USDT/EUR", rate: 0.92, change: +0.01, trend: "up" },
  { pair: "EUR/USDT", rate: 1.087, change: -0.003, trend: "down" },
  { pair: "UAH/EUR", rate: 0.024, change: +0.001, trend: "up" },
]

export function ExchangeRates() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Current Exchange Rates</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rates.map((rate) => (
            <div key={rate.pair} className="bg-muted p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{rate.pair}</span>
                {rate.trend === "up" ? (
                  <TrendingUp className="w-4 h-4 text-green-500" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-500" />
                )}
              </div>
              <div className="text-2xl font-bold">{rate.rate}</div>
              <div className={`text-sm ${rate.trend === "up" ? "text-green-600" : "text-red-600"}`}>
                {rate.change > 0 ? "+" : ""}
                {rate.change}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
