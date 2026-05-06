"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { TrendingUp, Users, Euro } from "lucide-react"

export function AdminPanel() {
  const [rates, setRates] = useState({
    "rub-eur": 0.0105,
    "eur-rub": 94.5,
    "usdt-eur": 0.92,
    "eur-usdt": 1.087,
    "uah-eur": 0.024,
  })

  const [balance] = useState({
    EUR: 5000,
    RUB: 450000,
    USDT: 2500,
    UAH: 120000,
  })

  const orders = [
    {
      id: "1",
      user: "Пользователь123",
      city: "Будва",
      direction: "RUB → EUR",
      amount: "10000 RUB → 105 EUR",
      status: "pending",
      createdAt: new Date(),
    },
    {
      id: "2",
      user: "Пользователь456",
      city: "Тиват",
      direction: "USDT → EUR",
      amount: "100 USDT → 92 EUR",
      status: "completed",
      createdAt: new Date(Date.now() - 86400000),
    },
  ]

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "В ожидании"
      case "completed":
        return "Завершен"
      case "cancelled":
        return "Отменен"
      default:
        return status
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
      case "completed":
        return "bg-green-500/20 text-green-400 border-green-500/30"
      case "cancelled":
        return "bg-red-500/20 text-red-400 border-red-500/30"
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30"
    }
  }

  return (
    <Tabs defaultValue="orders" className="w-full">
      <TabsList className="grid w-full grid-cols-3 bg-black/40 border-gray-600">
        <TabsTrigger
          value="orders"
          className="text-white data-[state=active]:bg-green-500 data-[state=active]:text-black"
        >
          Заказы
        </TabsTrigger>
        <TabsTrigger
          value="rates"
          className="text-white data-[state=active]:bg-green-500 data-[state=active]:text-black"
        >
          Курсы
        </TabsTrigger>
        <TabsTrigger
          value="balance"
          className="text-white data-[state=active]:bg-green-500 data-[state=active]:text-black"
        >
          Баланс
        </TabsTrigger>
      </TabsList>

      <TabsContent value="orders" className="space-y-4">
        <Card className="bg-black/40 border-gray-600">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Users className="w-5 h-5 text-green-400" />
              Управление заказами
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {orders.map((order) => (
                  <Card key={order.id} className="bg-black/60 border-gray-700">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="space-y-1">
                          <div className="font-medium text-white">Заказ #{order.id}</div>
                          <div className="text-sm text-gray-400">
                            {order.user} • {order.city}
                          </div>
                        </div>
                        <Badge className={getStatusColor(order.status)}>{getStatusText(order.status)}</Badge>
                      </div>

                      <div className="space-y-2">
                        <div className="text-sm">
                          <span className="text-gray-400">Направление:</span>
                          <span className="text-white ml-1">{order.direction}</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-gray-400">Сумма:</span>
                          <span className="text-white ml-1">{order.amount}</span>
                        </div>
                        <div className="text-xs text-gray-400">Создан: {order.createdAt.toLocaleString()}</div>
                      </div>

                      {order.status === "pending" && (
                        <div className="flex gap-2 mt-3">
                          <Button size="sm" className="bg-green-500 hover:bg-green-600 text-black">
                            Завершить
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-gray-600 text-white hover:bg-gray-700 bg-transparent"
                          >
                            Отменить
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="rates" className="space-y-4">
        <Card className="bg-black/40 border-gray-600">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <TrendingUp className="w-5 h-5 text-green-400" />
              Управление курсами
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(rates).map(([pair, rate]) => (
              <div key={pair} className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium text-white capitalize">
                    {pair.replace("-", " → ").toUpperCase()}
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.0001"
                    value={rate}
                    onChange={(e) =>
                      setRates((prev) => ({
                        ...prev,
                        [pair]: Number.parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="w-32 bg-black/50 border-gray-600 text-white"
                  />
                  <Button size="sm" className="bg-green-500 hover:bg-green-600 text-black">
                    Обновить
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="balance" className="space-y-4">
        <Card className="bg-black/40 border-gray-600">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Euro className="w-5 h-5 text-green-400" />
              Баланс валют
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(balance).map(([currency, amount]) => (
                <Card key={currency} className="bg-black/60 border-gray-700">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-400">{amount.toLocaleString()}</div>
                    <div className="text-sm text-gray-400">{currency}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
