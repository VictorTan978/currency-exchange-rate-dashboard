import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';

import { API_CONFIG } from '../../core/config/api.config';
import { Rate } from '../../core/models/rate.model';
import { ConnectivityService } from '../../core/services/connectivity.service';
import { CurrencyService } from '../../core/services/currency.service';
import { ExchangeRateService } from '../../core/services/exchange-rate.service';
import { CardComponent } from '../../shared/components/card/card.component';
import { CurrencySelectComponent } from '../../shared/components/currency-select/currency-select.component';
import { ErrorMessageComponent } from '../../shared/components/error-message/error-message.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { StaleNoticeComponent } from '../../shared/components/stale-notice/stale-notice.component';
import {
  SortableTableComponent,
  TableColumn,
} from '../../shared/components/sortable-table/sortable-table.component';
import { RateFormatPipe } from '../../shared/pipes/rate-format.pipe';
import { SearchFilterComponent } from '../search-filter/search-filter.component';

/**
 * Feature 1 + 4: real-time rates in a sortable table, with a base-currency
 * selector and a search filter. Reads live rates from {@link ExchangeRateService}
 * (the single source of truth also used by the conversion calculator).
 */
@Component({
  selector: 'app-rates-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    CardComponent,
    CurrencySelectComponent,
    SearchFilterComponent,
    SortableTableComponent,
    LoadingSpinnerComponent,
    ErrorMessageComponent,
    StaleNoticeComponent,
  ],
  templateUrl: './rates-table.component.html',
  styleUrl: './rates-table.component.scss',
})
export class RatesTableComponent {
  private readonly service = inject(ExchangeRateService);
  private readonly currencies = inject(CurrencyService);
  private readonly connectivity = inject(ConnectivityService);
  private readonly rateFormat = new RateFormatPipe();

  readonly baseOptions = this.currencies.currencies;
  readonly base = signal<string>(API_CONFIG.defaultBaseCurrency);
  readonly searchTerm = signal('');

  readonly loading = this.service.loading;
  readonly error = this.service.error;
  readonly lastUpdated = this.service.lastUpdated;
  readonly cachedAt = this.service.cachedAt;
  readonly offline = this.connectivity.offline;

  readonly columns: TableColumn<Rate>[] = [
    { key: 'code', label: 'Code' },
    { key: 'name', label: 'Currency' },
    { key: 'rate', label: 'Rate', numeric: true, format: (r) => this.rateFormat.transform(r.rate) },
    { key: 'base', label: 'Base' },
  ];

  /** Rates filtered by the current search term (matches code or name). */
  readonly filteredRates = computed<Rate[]>(() => {
    const term = this.searchTerm().toLowerCase();
    const rates = this.service.rates();
    if (!term) return rates;
    return rates.filter(
      (r) => r.code.toLowerCase().includes(term) || r.name.toLowerCase().includes(term),
    );
  });

  constructor() {
    this.service.load(this.base());
  }

  onBaseChange(code: string): void {
    this.base.set(code);
    this.searchTerm.set('');
    this.service.load(code);
  }

  onSearch(term: string): void {
    this.searchTerm.set(term);
  }

  retry(): void {
    this.service.load(this.base());
  }
}
