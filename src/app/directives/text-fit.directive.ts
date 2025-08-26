import {
  AfterViewInit,
  Directive,
  ElementRef,
  Input,
  NgZone,
  OnDestroy,
} from '@angular/core'

@Directive({
  selector: '[appTextFit]',
  standalone: true,
  exportAs: 'textFit', // allow template refs (#titleFit="textFit")
})
export class TextFitDirective implements AfterViewInit, OnDestroy {
  @Input() minPx = 8
  @Input() maxPx = 1024
  @Input() paddingPx = 0
  /** Refit only when container size changes (not content) */
  @Input() onlyOnResize = false
  /** Measure this text instead of the live content  */
  @Input() refText: string | null = null

  private ro?: ResizeObserver
  private mo?: MutationObserver
  private meas!: HTMLSpanElement
  private scheduled = false
  private inited = false
  private lastBest = 0

  constructor(
    private el: ElementRef<HTMLElement>,
    // zone: Allows running heavy tasks outside Angular to avoid unnecessary change detection.
    private zone: NgZone,
  ) {}

  ngAfterViewInit(): void {
    // hidden measuring element
    this.meas = document.createElement('span')
    Object.assign(this.meas.style, {
      position: 'absolute',
      visibility: 'hidden',
      whiteSpace: 'nowrap',
      left: '-99999px',
      top: '-99999px',
      padding: '0',
      margin: '0',
    } as Partial<CSSStyleDeclaration>)
    document.body.appendChild(this.meas)

    const host = this.el.nativeElement
    host.style.whiteSpace = 'nowrap' // ensure one line for the real node

    const container = host.parentElement ?? host // nullish coalescing operator ?? ensures a safe fallback (avoids null).

    this.zone.runOutsideAngular(() => {
      this.ro = new ResizeObserver(() => this.schedule())
      this.ro.observe(container)

      // Only observe content if not resize-only and no refText override
      if (!this.onlyOnResize && !this.refText) {
        this.mo = new MutationObserver(() => this.schedule())
        this.mo.observe(host, {
          childList: true,
          characterData: true,
          subtree: true,
        })
      }

      this.inited = true
      this.schedule()
    })
  }

  /** Public API: call this after you change the text (e.g., after "Save") */
  fitNow(): void {
    if (!this.inited) return
    this.scheduled = false
    this.fit()
  }

  // Schedule a font resize operation to run once, efficiently
  private schedule() {
    // If a resize task is already scheduled, skip to avoid duplicate work
    if (this.scheduled) return
    // Mark that a task is now scheduled
    this.scheduled = true
    // Queue the task to run at the end of the current JS task, before rendering
    queueMicrotask(() => {
      // Task is about to run, so mark as no longer scheduled
      this.scheduled = false
      this.fit() // Perform the actual font fitting calculation
    })
  }

  private fit() {
    const host = this.el.nativeElement
    const container = host.parentElement ?? host
    const cw = container.clientWidth | 0
    if (cw <= 0) return // hidden or not yet laid out

    const target = Math.max(0, cw - Math.max(0, this.paddingPx) * 2) // Determine the available space

    // mirror font properties into the measurer
    const cs = getComputedStyle(host) // Returns an object representing all the CSS styles currently applied to the element (host).
    this.meas.style.fontFamily = cs.fontFamily
    this.meas.style.fontStyle = cs.fontStyle
    this.meas.style.fontWeight = cs.fontWeight as string
    this.meas.style.fontStretch = cs.fontStretch as string
    this.meas.style.letterSpacing = cs.letterSpacing
    this.meas.style.fontFeatureSettings = cs.fontFeatureSettings
    ;(this.meas.style as any).fontVariantNumeric = (
      cs as any
    ).fontVariantNumeric

    this.meas.textContent = this.refText ?? host.textContent ?? ''

    // Binary search max font-size that fits the target width
    let lo = Math.max(1, this.minPx | 0)
    let hi = Math.max(lo, this.maxPx | 0)
    let best = lo

    while (lo <= hi) {
      const mid = (lo + hi) >> 1
      this.meas.style.fontSize = mid + 'px'
      // measure how wide it becomes
      const w = this.meas.getBoundingClientRect().width
      if (w <= target + 0.5) {
        //If the text width is less than or equal to the available container width (target), it fits → we try a bigger font.
        // +0.5 guards off-by-½px overflow
        best = mid
        lo = mid + 1
      } else {
        hi = mid - 1
      }
    }

    // Apply font-size only if difference is big enough to matter (avoid 1px jitter)
    if (Math.abs(best - this.lastBest) > 2) {
      host.style.fontSize = best + 'px'
      this.lastBest = best
    }
  }

  ngOnDestroy(): void {
    this.ro?.disconnect()
    this.mo?.disconnect()
    this.meas?.remove()
  }
}
