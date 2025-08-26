import { CommonModule } from '@angular/common'
import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  computed,
  signal,
  afterNextRender,
  Injector,
  inject,
} from '@angular/core'
import { FormsModule } from '@angular/forms'
import { TextFitDirective } from './directives/text-fit.directive'
import type { CountdownSettings as AppSettings } from './types' // { eventName: string; endIso: string }
import { StorageService } from './services/storage.service'

// ---------- utils ----------
function localIsoToMs(iso: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return Date.now()
  const y = +m[1],
    mo = +m[2] - 1, //- 1 on the month because JavaScript Date uses 0-based months
    d = +m[3]
  const t = new Date(y, mo, d, 0, 0, 0, 0).getTime() // local midnight for y/mo/d (mo is 0-based) → milliseconds since 1970
  return isFinite(t) ? t : Date.now() // If the time is a valid number, return it.
}

//  if old storage had `endDate`, map it to `endIso` and returns our saved settings (title + date)
function loadSettings(): AppSettings {
  const now = new Date()
  const def = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 20)
  return { eventName: 'Midsummer Eve', endIso: def.toISOString().slice(0, 10) }
}

// If User doesn't type anything in the Input it displays Event
function clampEventName(s: string) {
  const v = (s ?? '').trim()
  return v || 'Event'
}

//Ensure we only accept ISO-like dates in the shape YYYY-MM-DD.
function clampIsoDate(s: string, fallback: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : fallback
}

function partsFromDiff(targetMs: number, nowMs: number) {
  const diff = Math.max(0, targetMs - nowMs) //If the event is already past, clamp to 0
  const total = Math.floor(diff / 1000)
  // Logic to get Days, Hours, Minutes and Second
  const days = Math.floor(total / 86400)
  const hours = Math.floor((total % 86400) / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  return { days, hours, minutes, seconds }
}

function formatRemaining(p: ReturnType<typeof partsFromDiff>) {
  const ds = p.days === 1 ? 'day' : 'days'
  return `${p.days} ${ds}, ${p.hours} h, ${p.minutes} m, ${p.seconds} s`
}

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule, TextFitDirective],
  templateUrl: './app.component.html',
})
export class AppComponent implements OnInit, OnDestroy {
  // Grab the text-fit directives from the template one for title another for countdown
  @ViewChild('titleFit') titleFit?: TextFitDirective
  @ViewChild('countFit') countFit?: TextFitDirective

  private injector = inject(Injector)
  private storage = inject(StorageService)

  // persisted settings, A signal holding our saved settings ({ eventName, endIso })
  settings = signal<AppSettings>(this.storage.load() ?? loadSettings()) // <-- updated to use service

  // form model
  formEventName = signal(this.settings().eventName)
  formDate = signal(this.settings().endIso)

  // live clock
  now = signal<number>(Date.now())
  private timer?: any

  // derived
  targetMs = computed(() => localIsoToMs(this.settings().endIso))
  remainingParts = computed(() => partsFromDiff(this.targetMs(), this.now()))
  remainingLabel = computed(() => formatRemaining(this.remainingParts()))

  // Holds the **loaded quote text**. Empty string means "we don't have one yet".
  quote = signal<string>('')
  // True while the app is **fetching** a quote; false when done (success or error).
  quoteLoading = signal<boolean>(true)
  // Holds an **error message** if the fetch failed. Empty string = "no error".
  quoteError = signal<string>('')

  // --- NEW: track in-flight fetch for safe cancellation ---
  private quoteAbort?: AbortController

  ngOnInit(): void {
    // start a 1-second timer that updates the "now" signal
    this.timer = setInterval(() => this.now.set(Date.now()), 1000)
    // load the quote once when the component appears
    this.fetchQuote()
  }
  pastWarning = signal(false)

  isPastDate(iso: string): boolean {
    if (!iso) return false
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const chosen = new Date(iso)
    return chosen < today
  }

  ngOnDestroy(): void {
    // stop the timer when the component goes away
    clearInterval(this.timer)
    // cancel any in-flight quote request
    this.quoteAbort?.abort()
  }

  applySettings(): void {
    const next: AppSettings = {
      eventName: clampEventName(this.formEventName()),
      endIso: clampIsoDate(this.formDate(), this.settings().endIso),
    }

    this.settings.set(next)
    try {
      this.storage.save(next)
    } catch {}

    this.now.set(Date.now())
    this.pastWarning.set(this.isPastDate(next.endIso))

    // trigger a refit after the DOM updates
    afterNextRender(() => this.titleFit?.fitNow(), { injector: this.injector })
  }

  resetTo(daysAhead = 20): void {
    const d = new Date()
    d.setDate(d.getDate() + daysAhead)
    const iso = d.toISOString().slice(0, 10)
    this.formEventName.set('Midsummer Eve')
    this.formDate.set(iso)
    this.applySettings()
  }

  fetchQuote(): void {
    // cancel any in-flight request to avoid races
    this.quoteAbort?.abort()
    this.quoteAbort = new AbortController()

    this.quoteLoading.set(true)
    this.quoteError.set('')

    fetch('https://dummyjson.com/quotes/random', {
      cache: 'no-store', // get a fresh one each time
      signal: this.quoteAbort.signal,
    })
      .then((r) => {
        if (!r.ok) throw new Error('Network error')
        return r.json()
      })
      .then((data) => {
        this.quote.set(data?.quote ?? '')
      })
      .catch((err) => {
        // ignore AbortError (it's expected when we cancel)
        if (err?.name !== 'AbortError') {
          this.quoteError.set('Could not load quote')
        }
      })
      .finally(() => {
        // only unset loading if this request wasn't aborted
        if (!this.quoteAbort?.signal.aborted) {
          this.quoteLoading.set(false)
        }
      })
  }

  settingsSnapshot() {
    // Read the current value from the `settings` signal and return it.
    return this.settings()
  }
}
