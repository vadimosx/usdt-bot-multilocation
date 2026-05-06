"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Clock, CheckCircle, XCircle } from "lucide-react"

interface Order {
  id: string
  city: string
  direction: string
  fromAmount: string
  fromCurrency: string
  toAmount: string
  toCurrency: string
  status: "pending" | "completed" | "cancelled"
  createdAt: Date
  bank?: string
}

export function OrderManager() {
  const [orders] = useState<Order[]>([
    {
      id: "1",
      city: "Будва",
      direction: "RUB → EUR",
      fromAmount: "10000",
      fromCurrency: "RUB",
      toAmount: "105.00",
      toCurrency: "EUR",
      status: "pending",
      createdAt: new Date(),
      bank: "Сбербанк",
    },
    {
      id: "2",
      city: "Тиват",
      direction: "USDT → EUR",
      fromAmount: "100",
      fromCurrency: "USDT",
      toAmount: "92.00",
      toCurrency: "EUR",
      status: "completed",
      createdAt: new Date(Date.now() - 86400000),
    },
  ])

  const getStatusIcon = (status: Order["status"]) => {
    switch (status) {
      case "pending":
        return <Clock className="w-4 h-4" />
      case "completed":
        return <CheckCircle className="w-4 h-4" />
      case "cancelled":
        return <XCircle className="w-4 h-4" />
    }
  }

  const getStatusColor = (status: Order["status"]) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
      case "completed":
        return "bg-green-500/20 text-green-400 border-green-500/30"
      case "cancelled":
        return "bg-red-500/20 text-red-400 border-red-500/30"
    }
  }

  const getStatusText = (status: Order["status"]) => {
    switch (status) {
      case "pending":
        return "В ожидании"
      case "completed":
        return "Завершен"
      case "cancelled":
        return "Отменен"
    }
  }

  return (
    <div className="space-y-4">
      {orders.length === 0 ? (
        <div className="text-center py-8 text-gray-400">Заказов пока нет</div>
      ) : (
        <ScrollArea className="h-[400px]">
          <div className="space-y-3">
            {orders.map((order) => (
              <Card key={order.id} className="bg-black/40 border-gray-600">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="space-y-1">
                      <div className="font-medium text-sm text-white">#{order.id}</div>
                      <div className="text-xs text-gray-400">
                        {order.city} • {order.createdAt.toLocaleDateString()}
                      </div>
                    </div>
                    <Badge className={getStatusColor(order.status)}>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(order.status)}
                        {getStatusText(order.status)}
                      </div>
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm">
                      <span className="text-gray-400">Направление:</span>
                      <span className="text-white ml-1">{order.direction}</span>
                    </div>
                    {order.bank && (
                      <div className="text-sm">
                        <span className="text-gray-400">Банк:</span>
                        <span className="text-white ml-1">{order.bank}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">
                        Отдаете:{" "}
                        <span className="text-white">
                          {order.fromAmount} {order.fromCurrency}
                        </span>
                      </span>
                      <span className="text-gray-400">
                        Получаете:{" "}
                        <span className="text-green-400">
                          {order.toAmount} {order.toCurrency}
                        </span>
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  )
}
