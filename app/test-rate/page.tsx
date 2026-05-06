"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function TestRatePage() {
  const [testResult, setTestResult] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)

  const testUSDEURRate = async () => {
    setIsLoading(true)
    setTestResult("Тестирование...")

    try {
      console.log("[v0] Starting USD/EUR rate test...")

      // Test our API endpoint
      const response = await fetch("/api/rate")
      console.log("[v0] Response status:", response.status)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log("[v0] API Response:", data)

      let result = `Статус ответа: ${response.status}\n`
      result += `Данные: ${JSON.stringify(data, null, 2)}\n`

      if (data.success && data.rate) {
        result += `✅ Успешно получен курс USD/EUR: ${data.rate}\n`
        result += `Источник: ${data.source}\n`
        result += `Последнее обновление: ${data.lastUpdated}\n`

        // Validate rate is reasonable (should be between 0.8 and 1.2 typically)
        if (data.rate > 0.5 && data.rate < 2.0) {
          result += `✅ Курс выглядит разумно\n`
        } else {
          result += `⚠️ Курс кажется необычным: ${data.rate}\n`
        }
      } else {
        result += `❌ Не удалось получить курс: ${data.error || "Неизвестная ошибка"}\n`
      }

      setTestResult(result)
    } catch (error) {
      console.log("[v0] Error testing USD/EUR rate:", error.message)
      const errorResult = `❌ Ошибка при тестировании USD/EUR курса: ${error.message}\n`
      setTestResult(errorResult)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-4">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Тест получения курса USD/EUR</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={testUSDEURRate} disabled={isLoading} className="w-full">
            {isLoading ? "Тестирование..." : "Тестировать API курса"}
          </Button>

          {testResult && (
            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Результат теста:</h3>
              <pre className="whitespace-pre-wrap text-sm">{testResult}</pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
