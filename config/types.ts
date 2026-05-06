export interface City {
  id: string
  name: string
}

export interface ExchangeDirection {
  id: string
  from: string
  to: string
  name: string
  banks: string[]
}

export interface LocationConfig {
  /** Internal location key, e.g. "serbia" */
  key: string
  /** Display name in Russian, e.g. "Сербия" */
  name: string
  /** Subtitle on the main page */
  subtitle: string
  /** Page <title> tag */
  metaTitle: string
  /** Page meta description */
  metaDescription: string
  /** Background image path (in /public) */
  bgImage: string
  /** Hero image path (in /public) */
  heroImage: string
  /** List of cities for the city selector */
  cities: City[]
  /** Default city id */
  defaultCity: string
  /** List of currencies the calculator supports */
  currencies: { value: string; label: string }[]
  /** Allowed exchange directions */
  exchangeDirections: ExchangeDirection[]
  /** Google Sheet ID with rates and margin tiers */
  googleSheetId: string
  /** Telegram bot username without @, e.g. "rs_changebot" */
  botUsername: string
  /** IANA timezone for displayed times */
  timezone: string
}

export function getCityName(config: LocationConfig, cityId: string): string {
  return config.cities.find((c) => c.id === cityId)?.name ?? cityId
}
