"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ExchangeCalculatorUnified } from "@/components/exchange-calculator-unified"
import { OrderManager } from "@/components/order-manager"
import { AdminPanel } from "@/components/admin-panel"
import { LocationSwitcher } from "@/components/location-switcher"
import { ShoppingCart, Settings, Calculator, TrendingUp, Zap, MapPin } from "lucide-react"
import { activeLocation } from "@/config/locations"

export default function USDTManApp() {
  const [orderCount, setOrderCount] = useState(0)
  const [showOrders, setShowOrders] = useState(false)
  const [showAdmin, setShowAdmin] = useState(false)
  const [selectedCity, setSelectedCity] = useState(activeLocation.defaultCity)
  const calculatorRef = useRef<HTMLDivElement>(null)

  const scrollToCalculator = () => {
    calculatorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  // Scroll focused input into view when keyboard appears
  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return
    const handleResize = () => {
      const focused = document.activeElement as HTMLElement
      if (focused && focused.tagName !== "BODY" && focused.tagName !== "HTML") {
        setTimeout(() => {
          focused.scrollIntoView({ behavior: "smooth", block: "center" })
        }, 100)
      }
    }
    viewport.addEventListener("resize", handleResize)
    return () => viewport.removeEventListener("resize", handleResize)
  }, [])

  return (
    <div
      className="min-h-screen location-bg"
      style={{
        backgroundImage: `linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.8)), url("${activeLocation.bgImage}")`,
      }}
    >
      <div className="max-w-md mx-auto lg:max-w-sm">
        <div className="flex justify-between items-center p-4">
          <div className="flex gap-3">
            <div className="w-12 h-12 bg-black/60 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <Calculator className="w-6 h-6 text-green-400" />
            </div>
            <div className="w-12 h-12 bg-black/60 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <TrendingUp className="w-6 h-6 text-green-400" />
            </div>
            <div className="w-12 h-12 bg-black/60 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <Zap className="w-6 h-6 text-green-400" />
            </div>
          </div>

          <div className="flex gap-2">
            <div className="w-4 h-8 bg-red-500 rounded-full"></div>
            <div className="w-4 h-8 bg-yellow-500 rounded-full"></div>
            <div className="w-4 h-8 bg-green-500 rounded-full"></div>
          </div>
        </div>

        <div className="relative h-[420px] overflow-hidden">
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 z-10">
            <h1 className="text-3xl font-bold text-white text-center whitespace-nowrap">USDT MAN</h1>
          </div>

          <img
            src={activeLocation.heroImage}
            alt="USDT Man Superhero"
            className="w-[375px] h-[375px] mx-auto object-contain drop-shadow-2xl green-glow -mt-8"
          />

          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10 flex flex-col items-center gap-2">
            <p className="text-lg text-green-400 text-center whitespace-nowrap">{activeLocation.subtitle}</p>
            <button
              onClick={scrollToCalculator}
              className="px-5 py-2 bg-green-500/20 border border-green-500/50 rounded-full text-green-400 text-sm backdrop-blur-sm hover:bg-green-500/30 active:scale-95 transition-all whitespace-nowrap"
            >
              💱 Перейти к калькулятору
            </button>
          </div>
        </div>

        <div className="px-4 mt-3">
          <div className="glass-card rounded-2xl p-4 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <MapPin className="w-5 h-5 text-green-400" />
              <span className="text-white font-medium">Ваш город</span>
            </div>
            <p className="text-gray-300 mb-3">{activeLocation.name}</p>

            <LocationSwitcher value={selectedCity} onChange={setSelectedCity} />
          </div>
        </div>

        <div className="px-4 pb-6" ref={calculatorRef}>
          <ExchangeCalculatorUnified
            onOrderCreate={() => setOrderCount((prev) => prev + 1)}
            selectedCity={selectedCity}
          />
        </div>
      </div>

      <div className="fixed bottom-6 right-6 flex flex-col gap-3 hidden">
        <Dialog open={showOrders} onOpenChange={setShowOrders}>
          <DialogTrigger asChild>
            <Button
              size="lg"
              className="w-14 h-14 rounded-full bg-gray-600 hover:bg-gray-600 relative shadow-lg opacity-50 cursor-not-allowed"
              disabled
            >
              <ShoppingCart className="w-6 h-6" />
              {orderCount > 0 && (
                <Badge className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center text-xs bg-red-500">
                  {orderCount}
                </Badge>
              )}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md bg-black/90 border-green-500/30">
            <DialogHeader>
              <DialogTitle className="text-white">Мои заказы</DialogTitle>
            </DialogHeader>
            <OrderManager />
          </DialogContent>
        </Dialog>

        <Dialog open={showAdmin} onOpenChange={setShowAdmin}>
          <DialogTrigger asChild>
            <Button
              size="lg"
              className="w-14 h-14 rounded-full bg-gray-600 hover:bg-gray-600 shadow-lg opacity-50 cursor-not-allowed"
              disabled
            >
              <Settings className="w-6 h-6" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-black/90 border-green-500/30">
            <DialogHeader>
              <DialogTitle className="text-white">Панель администратора</DialogTitle>
            </DialogHeader>
            <AdminPanel />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
