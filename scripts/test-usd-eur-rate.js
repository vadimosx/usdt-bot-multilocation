// Test script to verify USD/EUR rate fetching from Binance
console.log("[v0] Starting USD/EUR rate test...")

async function testUSDEURRate() {
  try {
    console.log("[v0] Testing API endpoint...")

    // Test our API endpoint
    const response = await fetch("/api/rate")
    console.log("[v0] Response status:", response.status)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    console.log("[v0] API Response:", data)

    if (data.success && data.rate) {
      console.log("[v0] ✅ Successfully got USD/EUR rate:", data.rate)
      console.log("[v0] Source:", data.source)
      console.log("[v0] Last updated:", data.lastUpdated)

      // Validate rate is reasonable (should be between 0.8 and 1.2 typically)
      if (data.rate > 0.5 && data.rate < 2.0) {
        console.log("[v0] ✅ Rate looks reasonable")
      } else {
        console.log("[v0] ⚠️ Rate seems unusual:", data.rate)
      }
    } else {
      console.log("[v0] ❌ Failed to get rate:", data.error || "Unknown error")
    }
  } catch (error) {
    console.log("[v0] ❌ Error testing USD/EUR rate:", error.message)
    console.log("[v0] Full error:", error)
  }
}

// Run the test
testUSDEURRate()
