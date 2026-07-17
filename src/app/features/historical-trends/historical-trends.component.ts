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
import { HistoricalService } from '../../core/services/historical.service';
import { ThemeService } from '../../core/services/theme.service';
import { CardComponent } from '../../shared/components/card/card.component';
import { CurrencySelectComponent } from '../../shared/components/currency-select/currency-select.component';
import { ErrorMessageComponent } from '../../shared/components/error-message/error-message.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { StaleNoticeComponent } from '../../shared/components/stale-notice/stale-notice.component';
import { aggregate } from '../../shared/utils/aggregation.util';
import { isoDateDaysAgo, toIsoDate } from '../../shared/utils/date.util';

/** Categorical series colors (dataviz skill, slots 1–3), validated for both themes. */
const SERIES_COLORS_LIGHT = ['#2a78d6', '#008300', '#e87ba4'];
const SERIES_COLORS_DARK = ['#3987e5', '#008300', '#d55181'];

const AGGREGATIONS: Aggregation[] = ['daily', 'weekly', 'monthly'];

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
  private readonly destroyRef = inject(DestroyRef);

  readonly offline = this.connectivity.offline;

  readonly maxCurrencies = API_CONFIG.maxTrendCurrencies;
  readonly aggregations = AGGREGATIONS;
  readonly limitHint = `You can compare up to ${API_CONFIG.maxTrendCurrencies} currencies. Remove one to pick another.`;

  readonly currencies = signal<Currency[]>([]);
  readonly base = signal('USD');
  readonly selected = signal<string[]>(['EUR', 'GBP', 'CHF']);
  readonly aggregation = signal<Aggregation>('daily');

  private readonly series = signal<CurrencySeries[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  /** When the plotted series were cached, or null when they came from the network. */
  readonly cachedAt = signal<Date | null>(null);

  /** Currency options excluding the base (can't compare a currency to itself). */
  readonly currencyOptions = computed(() => this.currencies().filter((c) => c.code !== this.base()));

  readonly atLimit = computed(() => this.selected().length >= this.maxCurrencies);

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

  /** Fetches the time-series for the current base + selection over the past month. */
  reload(): void {
    const symbols = this.selected();
    if (symbols.length === 0) {
      this.series.set([]);
      this.cachedAt.set(null);
      return;
    }
    const end = toIsoDate(new Date());
    const start = isoDateDaysAgo(30);

    this.loading.set(true);
    this.error.set(null);
    // `getTrends` serves cached series when offline or on failure, so an error
    // here means there was nothing cached for this base + selection either.
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
    this.aggregation.set(mode);
  }

  isSelected(code: string): boolean {
    return this.selected().includes(code);
  }

  private seriesColors(): string[] {
    return this.theme.isDark() ? SERIES_COLORS_DARK : SERIES_COLORS_LIGHT;
  }
}
