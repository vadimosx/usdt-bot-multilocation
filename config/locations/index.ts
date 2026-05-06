import type { LocationConfig } from "../types"
import { serbiaConfig } from "./serbia"
import { montenegroConfig } from "./montenegro"

const ALL_LOCATIONS: Record<string, LocationConfig> = {
  serbia: serbiaConfig,
  montenegro: montenegroConfig,
}

const ACTIVE_KEY = (process.env.NEXT_PUBLIC_LOCATION || process.env.LOCATION || "serbia").toLowerCase()

export const activeLocation: LocationConfig = ALL_LOCATIONS[ACTIVE_KEY] ?? serbiaConfig

export { serbiaConfig, montenegroConfig }
export type { LocationConfig }
