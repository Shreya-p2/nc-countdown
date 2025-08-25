import { Injectable } from '@angular/core'
import type { CountdownSettings } from '../types'

// Using constant for the localStorage key to avoid hardcoding strings everywhere
// 'nc' = Natural Cycles (namespace to prevent conflicts)
// 'settings' = stores the user preferences for countdown (event name + end date)
// 'v1' = version number of this storage format (helps when upgrading the app later)

const KEY = 'nc-settings-v1' // <-- aligned with component's STORAGE_KEY

@Injectable({ providedIn: 'root' })
export class StorageService {
  /**
   * Load countdown settings from localStorage.
   * Returns null if nothing is stored or if data is invalid.
   */
  load(): CountdownSettings | null {
    try {
      // Get the raw JSON string from localStorage using our KEY
      const raw = localStorage.getItem(KEY)
      // If data exists, parse it into CountdownSettings object, else return null
      return raw ? (JSON.parse(raw) as CountdownSettings) : null
    } catch {
      // If parsing fails (corrupted data), return null safely
      return null
    }
  }
  /**
   * Save countdown settings to localStorage as a JSON string.
   */
  save(value: CountdownSettings) {
    try {
      // Convert the object into a JSON string and store it under our KEY
      localStorage.setItem(KEY, JSON.stringify(value))
    } catch {}
  }
}
