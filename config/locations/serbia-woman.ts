import type { LocationConfig } from "../types"
import { USDT_WOMAN } from "../brands"
import { serbiaConfig } from "./serbia"

/**
 * USDT Woman Serbia — та же логика, курсы и Google-шит, что у USDT Man Serbia.
 * Отличаются только бренд, тема оформления, картинки и Telegram-бот.
 */
export const serbiaWomanConfig: LocationConfig = {
  ...serbiaConfig,
  key: "serbia-woman",
  brand: USDT_WOMAN,
  subtitle: "Обмен криптовалют в Сербии",
  metaTitle: "USDT Woman - Обмен криптовалют в Сербии",
  metaDescription: "Обмен USDT, EUR, RUB, RSD в Белграде",
  // TODO: положить public/images/usdt-woman-hero.png (PNG с прозрачным фоном, ~1024x1792) и поменять путь
  heroImage: "/images/usdt-man-hero.png",
  // TODO: заменить на реальный username нового бота (без @)
  botUsername: "usdtwoman_serbia_bot",
}
