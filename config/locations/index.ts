import type { LocationConfig } from "../types"
import { serbiaConfig } from "./serbia"
import { montenegroConfig } from "./montenegro"
import { serbiaWomanConfig } from "./serbia-woman"

const ALL_LOCATIONS: Record<string, LocationConfig> = {
  serbia: serbiaConfig,
  montenegro: montenegroConfig,
  "serbia-woman": serbiaWomanConfig,
}

const ACTIVE_KEY = (process.env.NEXT_PUBLIC_LOCATION || process.env.LOCATION || "serbia").toLowerCase()

export const activeLocation: LocationConfig = ALL_LOCATIONS[ACTIVE_KEY] ?? serbiaConfig

export { serbiaConfig, montenegroConfig, serbiaWomanConfig }
export type { LocationConfig }
