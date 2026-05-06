import type { LocationConfig } from "../types"

const RUB_BANKS = ["Сбербанк", "Райффайзен", "Тинькофф", "Наличные рубли", "Другие банки"]

export const montenegroConfig: LocationConfig = {
  key: "montenegro",
  name: "Черногория",
  subtitle: "Обмен криптовалют в Черногории",
  metaTitle: "USDT Man - Обмен криптовалют в Черногории",
  metaDescription: "Обмен USDT, EUR, RUB в Черногории",
  bgImage: "/images/montenegro-landscape.jpg",
  heroImage: "/images/usdt-man-hero.png",
  cities: [
    { id: "budva", name: "Будва" },
    { id: "tivat", name: "Тиват" },
    { id: "herceg-novi", name: "Херцег-Нови" },
    { id: "bar", name: "Бар" },
    { id: "podgorica", name: "Подгорица" },
    { id: "other", name: "Другой город" },
  ],
  defaultCity: "budva",
  currencies: [
    { value: "USDT", label: "USDT" },
    { value: "EUR", label: "EUR" },
    { value: "RUB", label: "RUB" },
  ],
  exchangeDirections: [
    { id: "usdt-eur", from: "USDT", to: "EUR", name: "USDT → EUR", banks: [] },
    { id: "eur-usdt", from: "EUR", to: "USDT", name: "EUR → USDT", banks: [] },
    { id: "rub-eur", from: "RUB", to: "EUR", name: "RUB → EUR", banks: RUB_BANKS },
    { id: "eur-rub", from: "EUR", to: "RUB", name: "EUR → RUB", banks: RUB_BANKS },
    { id: "usdt-rub", from: "USDT", to: "RUB", name: "USDT → RUB", banks: [] },
    { id: "rub-usdt", from: "RUB", to: "USDT", name: "RUB → USDT", banks: [] },
  ],
  googleSheetId: "116zy1j648bV0xev1l5GJ_5QuYYaN9wo9twIeSq2uPyk",
  botUsername: "me_changebot",
  timezone: "Europe/Podgorica",
}
