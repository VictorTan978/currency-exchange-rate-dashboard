import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DestroyRef } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { ChartConfiguration } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

import { API_CONFIG } from '../../core/config/api.config';
import { Currency } from '../../core/models/currency.model';
import { Aggregation, CurrencySeries } from '../../core/models/historical.model';
import { ConnectivityService } from '../../core/services/connectivity.service';
import { ErrorDialogService } from '../../core/services/error-dialog.service';
import { HistoricalService } from '../../core/services/historical.service';
import { ThemeService } from '../../core/services/theme.service';
import { CardComponent } from '../../shared/components/card/card.component';
import { CurrencySelectComponent } from '../../shared/components/currency-select/currency-select.component';
import { ErrorMessageComponent } from '../../shared/components/error-message/error-message.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { StaleNoticeComponent } from '../../shared/components/stale-notice/stale-notice.component';
import { aggregate } from '../../shared/utils/aggregation.util';
import { isoDateDaysAgo, monthsSpanned, toIsoDate, weeksSpanned } from '../../shared/utils/date.util';

/** Categorical series colors (dataviz skill, slots 1–3), validated for both themes. */
const SERIES_COLORS_LIGHT = ['#2a78d6', '#008300', '#e87ba4'];
const SERIES_COLORS_DARK = ['#3987e5', '#008300', '#d55181'];

const AGGREGATIONS: Aggregation[] = ['daily', 'weekly', 'monthly'];

/** Quick-range shortcuts for the date picker. `days` is the lookback from today; 'ytd' = since Jan 1. */
interface RangePreset {
  readonly id: string;
  readonly label: string;
  readonly span: number | 'ytd';
}
const RANGE_PRESETS: readonly RangePreset[] = [
  { id: '7d', label: '7D', span: 7 },
  { id: '30d', label: '30D', span: 30 },
  { id: '90d', label: '90D', span: 90 },
  { id: '6m', label: '6M', span: 182 },
  { id: 'ytd', label: 'YTD', span: 'ytd' },
];

/**
 * Feature 2: historical trends chart. Compares up to 3 currencies against a base
 * over the past month, with a daily/weekly/monthly aggregation toggle. Data comes
 * from {@link HistoricalService} (Frankfurter); aggregation is applied client-side.
 */
@Component({
  selector: 'app-historical-trends',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TitleCasePipe,
    BaseChartDirective,
    CardComponent,
    CurrencySelectComponent,
    LoadingSpinnerComponent,
    ErrorMessageComponent,
    StaleNoticeComponent,
  ],
  templateUrl: './historical-trends.component.html',
  styleUrl: './historical-trends.component.scss',
})
export class HistoricalTrendsComponent {
  private readonly historical = inject(HistoricalService);
  private readonly theme = inject(ThemeService);
  private readonly connectivity = inject(ConnectivityService);
  private readonly errorDialog = inject(ErrorDialogService);
  private readonly destroyRef = inject(DestroyRef);

  readonly offline = this.connectivity.offline;

  readonly maxCurrencies = API_CONFIG.maxTrendCurrencies;
  readonly aggregations = AGGREGATIONS;
  readonly limitHint = `You can compare up to ${API_CONFIG.maxTrendCurrencies} currencies. Remove one to pick another.`;

  readonly currencies = signal<Currency[]>([]);
  readonly base = signal('USD');
  readonly selected = signal<string[]>(['EUR', 'GBP', 'CHF']);
  readonly aggregation = signal<Aggregation>('daily');

  /** Today's ISO date — the latest selectable date (no future rates exist). */
  readonly today = toIsoDate(new Date());
  /** User-chosen date range for the chart; defaults to the last 30 days. */
  readonly startDate = signal(isoDateDaysAgo(30));
  readonly endDate = signal(this.today);

  readonly presets = RANGE_PRESETS;

  private readonly series = signal<CurrencySeries[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  /** When the plotted series were cached, or null when they came from the network. */
  readonly cachedAt = signal<Date | null>(null);

  /** Currency options excluding the base (can't compare a currency to itself). */
  readonly currencyOptions = computed(() => this.currencies().filter((c) => c.code !== this.base()));

  readonly atLimit = computed(() => this.selected().length >= this.maxCurrencies);

  /** Subtitle showing which range is plotted, e.g. "Rates vs USD · 2026-06-23 → 2026-07-23". */
  readonly rangeSubtitle = computed(
    () => `Rates vs ${this.base()} · ${this.startDate()} → ${this.endDate()}`,
  );

  /** The id of the preset matching the current range, or null for a custom range. */
  readonly activePreset = computed(() => {
    if (this.endDate() !== this.today) {
      return null;
    }
    const start = this.startDate();
    return this.presets.find((p) => this.presetStart(p) === start)?.id ?? null;
  });

  /** Chart.js data built from the fetched series with the chosen aggregation applied. */
  readonly chartData = computed<ChartConfiguration<'line'>['data']>(() => {
    const mode = this.aggregation();
    const colors = this.seriesColors();
    const aggregated = this.series().map((s) => ({ code: s.code, points: aggregate(s.points, mode) }));
    const labels = [...new Set(aggregated.flatMap((s) => s.points.map((p) => p.date)))].sort();

    return {
      labels,
      datasets: aggregated.map((s, i) => {
        const byDate = new Map(s.points.map((p) => [p.date, p.value]));
        const color = colors[i % colors.length];
        return {
          label: s.code,
          data: labels.map((d) => byDate.get(d) ?? null),
          borderColor: color,
          backgroundColor: color,
          pointBackgroundColor: color,
          pointRadius: labels.length > 40 ? 0 : 3,
          borderWidth: 2,
          tension: 0.25,
          spanGaps: true,
        };
      }),
    };
  });

  /** Chart options; recomputed on theme change so axis/legend ink stays legible. */
  readonly chartOptions = computed<ChartConfiguration<'line'>['options']>(() => {
    const dark = this.theme.isDark();
    const tick = dark ? '#97a3bd' : '#5b6577';
    const grid = dark ? 'rgba(255,255,255,0.08)' : 'rgba(20,30,60,0.08)';
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'top', labels: { usePointStyle: true, boxWidth: 8, color: tick } },
        tooltip: { enabled: true },
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: tick, maxRotation: 0, autoSkip: true, maxTicksLimit: 8 } },
        y: { grid: { color: grid }, ticks: { color: tick }, beginAtZero: false },
      },
    };
  });

  constructor() {
    this.loadCurrencies();
    this.reload();
  }

  private loadCurrencies(): void {
    this.historical
      .getCurrencies()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (currencies) => this.currencies.set(currencies),
        // Non-fatal: chart can still render with the default selection.
        error: () => undefined,
      });
  }

  /** Fetches the time-series for the current base + selection over the chosen range. */
  reload(): void {
    const symbols = this.selected();
    if (symbols.length === 0) {
      this.series.set([]);
      this.cachedAt.set(null);
      return;
    }
    const start = this.startDate();
    const end = this.endDate();

    this.loading.set(true);
    this.error.set(null);
    // `getTrends` serves cached series when offline or on failure, so an error
    // here means there was nothing cached for this base + selection + range either.
    this.historical
      .getTrends(this.base(), symbols, start, end)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ series, cachedAt }) => {
          this.series.set(series);
          this.cachedAt.set(cachedAt);
          this.loading.set(false);
        },
        error: () => {
          // Nothing cached for this selection: drop any series/notice left over
          // from a previous selection so the error shows alone, not stacked on a
          // stale "cached data" notice for data we're no longer displaying.
          this.series.set([]);
          this.cachedAt.set(null);
          this.error.set('Could not load historical data.');
          this.loading.set(false);
        },
      });
  }

  onBaseChange(code: string): void {
    this.base.set(code);
    // Drop the new base from the comparison list if it was selected.
    this.selected.update((list) => list.filter((c) => c !== code));
    this.reload();
  }

  /** Sets the range start; clamps the end forward if the user picked a start past it. */
  onStartDateChange(value: string): void {
    if (!value) {
      return;
    }
    this.startDate.set(value);
    if (this.endDate() < value) {
      this.endDate.set(value);
    }
    this.keepAggregationInRange();
    this.reload();
  }

  /** Sets the range end; clamps the start back if the user picked an end before it. */
  onEndDateChange(value: string): void {
    if (!value) {
      return;
    }
    this.endDate.set(value);
    if (this.startDate() > value) {
      this.startDate.set(value);
    }
    this.keepAggregationInRange();
    this.reload();
  }

  /** Applies a quick-range preset: sets the range to end today and reload. */
  applyPreset(preset: RangePreset): void {
    this.startDate.set(this.presetStart(preset));
    this.endDate.set(this.today);
    this.keepAggregationInRange();
    this.reload();
  }

  /** The ISO start date a preset resolves to, relative to today. */
  private presetStart(preset: RangePreset): string {
    return preset.span === 'ytd' ? `${this.today.slice(0, 4)}-01-01` : isoDateDaysAgo(preset.span);
  }

  toggleCurrency(code: string): void {
    const selected = this.selected();
    if (selected.includes(code)) {
      this.selected.set(selected.filter((c) => c !== code));
    } else if (selected.length < this.maxCurrencies) {
      this.selected.set([...selected, code]);
    }
    this.reload();
  }

  setAggregation(mode: Aggregation): void {
    // Weekly/monthly over too short a range collapses to a single point, which
    // reads as a flat, meaningless chart. Refuse the switch and explain why.
    if (this.bucketCount(mode) < 2) {
      this.warnRangeTooShort(mode);
      return;
    }
    this.aggregation.set(mode);
  }

  /**
   * Drops back to daily (with a dialog) when the current aggregation no longer
   * fits the range — e.g. the user narrows the dates while on weekly/monthly.
   * Keeps the chart meaningful instead of letting it degrade to one point.
   */
  private keepAggregationInRange(): void {
    const mode = this.aggregation();
    if (mode !== 'daily' && this.bucketCount(mode) < 2) {
      this.aggregation.set('daily');
      this.warnRangeTooShort(mode);
    }
  }

  /** How many buckets the chosen aggregation yields over the current range. */
  private bucketCount(mode: Aggregation): number {
    if (mode === 'weekly') {
      return weeksSpanned(this.startDate(), this.endDate());
    }
    if (mode === 'monthly') {
      return monthsSpanned(this.startDate(), this.endDate());
    }
    return Number.POSITIVE_INFINITY; // daily always fits
  }

  private warnRangeTooShort(mode: Aggregation): void {
    const unit = mode === 'weekly' ? 'week' : 'month';
    this.errorDialog.show({
      title: `Range too short for the ${mode} view`,
      message:
        `${this.startDate()} → ${this.endDate()} spans a single ${unit}, so a ${mode} chart ` +
        `would collapse to one point. Widen the range to cover at least two ${unit}s to use the ${mode} view.`,
    });
  }

  isSelected(code: string): boolean {
    return this.selected().includes(code);
  }

  /**
   * The series color assigned to `code`'s line/legend point, or null when it
   * isn't selected. Mirrors the dataset coloring in {@link chartData}: series
   * are built from `selected()` in order (see `toSeries`), so a currency's line
   * color is its slot in the selection.
   */
  colorFor(code: string): string | null {
    const index = this.selected().indexOf(code);
    if (index === -1) {
      return null;
    }
    const colors = this.seriesColors();
    return colors[index % colors.length];
  }

  private seriesColors(): string[] {
    return this.theme.isDark() ? SERIES_COLORS_DARK : SERIES_COLORS_LIGHT;
  }
}
