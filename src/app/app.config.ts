import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';

import { routes } from './app.routes';
import { apiStatusInterceptor } from './core/interceptors/api-status.interceptor';
import { CurrencyService } from './core/services/currency.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withFetch(), withInterceptors([apiStatusInterceptor])),
    provideCharts(withDefaultRegisterables()),
    // Fire-and-forget: the static currency list renders until this resolves, so
    // startup isn't blocked on it (and isn't broken by it failing).
    provideAppInitializer(() => inject(CurrencyService).load()),
  ]
};
