import type { LocationConfig } from "../types"

const RUB_BANKS = ["Сбербанк", "Райффайзен", "Тинькофф", "Наличные рубли", "Другие банки"]

export const serbiaConfig: LocationConfig = {
  key: "serbia",
  name: "Сербия",
  subtitle: "Обмен криптовалют в Сербии",
  metaTitle: "USDT Man - Обмен криптовалют в Сербии",
  metaDescription: "Обмен USDT, EUR, RUB, RSD в Белграде",
  bgImage: "/images/serbia-landscape.jpg",
  heroImage: "/images/usdt-man-hero.png",
  cities: [{ id: "belgrade", name: "Белград" }],
  defaultCity: "belgrade",
  currencies: [
    { value: "USDT", label: "USDT" },
    { value: "EUR", label: "EUR" },
    { value: "RUB", label: "RUB" },
    { value: "RSD", label: "RSD" },
  ],
  exchangeDirections: [
    { id: "usdt-eur", from: "USDT", to: "EUR", name: "USDT → EUR", banks: [] },
    { id: "eur-usdt", from: "EUR", to: "USDT", name: "EUR → USDT", banks: [] },
    { id: "rub-eur", from: "RUB", to: "EUR", name: "RUB → EUR", banks: RUB_BANKS },
    { id: "eur-rub", from: "EUR", to: "RUB", name: "EUR → RUB", banks: RUB_BANKS },
    { id: "usdt-rub", from: "USDT", to: "RUB", name: "USDT → RUB", banks: [] },
    { id: "rub-usdt", from: "RUB", to: "USDT", name: "RUB → USDT", banks: [] },
    { id: "usdt-rsd", from: "USDT", to: "RSD", name: "USDT → RSD", banks: [] },
    { id: "rsd-usdt", from: "RSD", to: "USDT", name: "RSD → USDT", banks: [] },
    { id: "rub-rsd", from: "RUB", to: "RSD", name: "RUB → RSD", banks: [] },
    { id: "rsd-rub", from: "RSD", to: "RUB", name: "RSD → RUB", banks: [] },
  ],
  googleSheetId: "1Dsvw70wN7oDHFfxXw2FWe6PmoliDLYO08s7935z_FBQ",
  botUsername: "rs_changebot",
  timezone: "Europe/Belgrade",
}
