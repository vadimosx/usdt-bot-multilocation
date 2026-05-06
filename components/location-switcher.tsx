"use client"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MapPin } from "lucide-react"
import { activeLocation } from "@/config/locations"

interface LocationSwitcherProps {
  value?: string
  onChange?: (value: string) => void
}

export function LocationSwitcher({ value, onChange }: LocationSwitcherProps) {
  const cities = activeLocation.cities
  const currentValue = value ?? activeLocation.defaultCity

  return (
    <Select value={currentValue} onValueChange={onChange}>
      <SelectTrigger className="w-full bg-black/50 border-gray-600 text-white h-12">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-green-400" />
          <SelectValue />
        </div>
      </SelectTrigger>
      <SelectContent className="bg-black border-gray-600">
        {cities.map((city) => (
          <SelectItem key={city.id} value={city.id} className="text-white hover:bg-gray-800">
            <span>{city.name}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
