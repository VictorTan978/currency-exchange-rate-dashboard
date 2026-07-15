import { ChangeDetectionStrategy, Component } from '@angular/core';

import { ConversionCalculatorComponent } from '../features/conversion-calculator/conversion-calculator.component';
import { HistoricalTrendsComponent } from '../features/historical-trends/historical-trends.component';
import { RatesTableComponent } from '../features/rates-table/rates-table.component';

/**
 * Composition root for the dashboard — lays out the four core feature areas.
 * Feature components own their own state/services; the dashboard only arranges them.
 */
@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RatesTableComponent, ConversionCalculatorComponent, HistoricalTrendsComponent],
  template: `
    <div class="dashboard">
      <div class="dashboard__col dashboard__col--main">
        <app-rates-table />
        <app-historical-trends />
      </div>
      <div class="dashboard__col dashboard__col--side">
        <app-conversion-calculator />
      </div>
    </div>
  `,
  styles: [
    `
      .dashboard {
        display: grid;
        grid-template-columns: minmax(0, 2fr) minmax(320px, 1fr);
        gap: 1.5rem;
        align-items: start;
      }
      .dashboard__col {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        min-width: 0;
      }
      @media (max-width: 960px) {
        .dashboard {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class DashboardComponent {}
