/// <reference types="cypress" />

/** Same rates as cypress/fixtures/rates.json, per 1 USD. */
const RATES: Record<string, number> = { USD: 1, EUR: 0.8, GBP: 0.75, JPY: 150, CHF: 0.9 };

/**
 * Stubs the keyed `pair` endpoint. Computed rather than a fixture so the reply
 * tracks the requested amount and stays consistent with rates.json — the local
 * fallback and the API path must agree for the fallback tests to mean anything.
 */
function stubPairEndpoint(): void {
  cy.intercept('GET', '**/pair/**', (req) => {
    const [, from, to, amount] = req.url.match(/\/pair\/([A-Z]+)\/([A-Z]+)\/([\d.]+)/) ?? [];
    const rate = RATES[to] / RATES[from];
    req.reply({
      result: 'success',
      base_code: from,
      target_code: to,
      conversion_rate: rate,
      conversion_result: Number(amount) * rate,
    });
  }).as('pair');
}

describe('Currency Exchange Rate Dashboard', () => {
  beforeEach(() => {
    // Stub every API so the suite is deterministic and offline-safe.
    cy.intercept('GET', '**/v6/latest/*', { fixture: 'rates.json' }).as('rates');
    cy.intercept('GET', '**/codes', { fixture: 'codes.json' }).as('codes');
    cy.intercept('GET', '**/v1/currencies', { fixture: 'currencies.json' }).as('currencies');
    cy.intercept('GET', '**/v1/*..*', { fixture: 'timeseries.json' }).as('timeseries');
    stubPairEndpoint();

    cy.visit('/');
    cy.wait('@rates');
  });

  it('shows the exchange rates table with data', () => {
    cy.contains('h2', 'Exchange Rates');
    cy.get('app-sortable-table tbody tr').should('have.length', 5);
    cy.get('app-rates-table').contains('td', 'EUR');
    cy.contains('5 currencies');
  });

  it('names rates from the /codes endpoint rather than the static fallback', () => {
    cy.wait('@codes');
    // codes.json names GBP "Pound Sterling"; the static fallback says "British
    // Pound", so this only passes if the provider list won.
    cy.get('app-rates-table').contains('td', 'Pound Sterling');
  });

  it('sorts the table by rate ascending on header click', () => {
    cy.get('app-rates-table').contains('th', 'Rate').click();
    // Lowest rate in the fixture is GBP (0.75)
    cy.get('app-sortable-table tbody tr').first().should('contain', 'GBP');
  });

  it('filters currencies through the search box', () => {
    cy.get('app-search-filter input').type('eur');
    cy.get('app-sortable-table tbody tr').should('have.length', 1);
    cy.get('app-sortable-table tbody').contains('EUR');
  });

  it('converts an amount between two currencies', () => {
    cy.get('#conv-amount').clear();
    cy.get('#conv-amount').type('100');
    // Default USD → EUR at 0.8 = 80
    cy.get('.conv__result').should('contain', '80');
    cy.get('.conv__result').should('contain', 'EUR');
  });

  it('converts through the live API and reports the timing', () => {
    cy.get('#conv-amount').clear();
    cy.get('#conv-amount').type('100');

    cy.wait('@pair').its('request.url').should('include', '/pair/USD/EUR/100');
    cy.get('.conv__badge').should('contain', 'Live API');
    // `.invoke('text')` first: on a jQuery subject, `match` is chai-jquery's
    // CSS-selector assertion, not chai's regex one.
    cy.get('.conv__timing')
      .invoke('text')
      .should('match', /(\d|<0\.1)\s*ms/);
    cy.get('.conv__result').should('contain', '80');
  });

  it('falls back to local rates when the pair API is unreachable', () => {
    // Overrides the beforeEach stub for this test only.
    cy.intercept('GET', '**/pair/**', { forceNetworkError: true }).as('pairDown');

    cy.get('#conv-amount').clear();
    cy.get('#conv-amount').type('100');

    cy.get('.conv__badge').should('contain', 'Local rates');
    // Same answer as the API path — the fallback uses the already-fetched rates.
    cy.get('.conv__result').should('contain', '80');
  });

  it('swaps the converter currencies', () => {
    cy.get('.conv__swap').click();
    cy.get('.conv__result-rate').should('contain', '1 EUR');
  });

  it('renders the historical chart and switches aggregation', () => {
    cy.wait('@timeseries');
    cy.get('app-historical-trends canvas').should('be.visible');

    cy.get('app-historical-trends').contains('.trends__agg-btn', 'Weekly').click();
    cy.get('app-historical-trends')
      .contains('.trends__agg-btn', 'Weekly')
      .should('have.attr', 'aria-pressed', 'true');
  });

  it('toggles between light and dark themes', () => {
    cy.get('html')
      .invoke('attr', 'data-theme')
      .then((before) => {
        cy.get('.app-header__theme').click();
        cy.get('html').should(($html) => {
          expect($html.attr('data-theme')).to.not.equal(before);
        });
      });
  });

  it('limits currency comparison to three selections', () => {
    cy.wait('@timeseries');
    // EUR, GBP, CHF are selected by default (3/3); adding JPY must be blocked.
    cy.get('app-historical-trends').contains('.chip', 'JPY').should('be.disabled');
    cy.get('app-historical-trends').contains('3/3');
  });

  /**
   * Cypress clears localStorage between tests, so each of these warms the cache
   * through the `beforeEach` visit and then re-enters the app in the same test.
   */
  describe('offline mode', () => {
    /** Waits for the first visit to have cached every payload the app stores. */
    function waitForWarmCache(): void {
      cy.wait('@codes');
      cy.wait('@timeseries');
    }

    it('serves cached data, skips requests, and flags it when started offline', () => {
      waitForWarmCache();

      // Re-enter with the browser reporting no connection. Requests are still
      // stubbed, so any that fire would succeed — proving the app skipped them.
      cy.visit('/', {
        onBeforeLoad(win) {
          Object.defineProperty(win.navigator, 'onLine', { value: false, configurable: true });
        },
      });

      cy.get('.app-offline').should('contain', "You're offline");

      // Rates: cached, rendered, and marked not live.
      cy.get('app-rates-table app-stale-notice').should('contain', 'Not live');
      cy.get('app-rates-table app-stale-notice').should('contain', "You're offline");
      cy.get('app-sortable-table tbody tr').should('have.length', 5);
      cy.get('app-rates-table').contains('td', 'EUR');

      // History: cached series still plot.
      cy.get('app-historical-trends app-stale-notice').should('contain', 'Not live');
      cy.get('app-historical-trends canvas').should('be.visible');

      // Conversion: local arithmetic over the cached rates.
      cy.get('#conv-amount').clear();
      cy.get('#conv-amount').type('100');
      cy.get('.conv__badge').should('contain', 'Local rates');
      cy.get('.conv__result').should('contain', '80');

      // Only the first (online) visit hit the network.
      cy.get('@rates.all').should('have.length', 1);
      cy.get('@pair.all').should('have.length', 0);
    });

    it('falls back to cached data when the providers are unreachable', () => {
      waitForWarmCache();

      // Online as far as the browser knows, but every provider is down.
      cy.intercept('GET', '**/v6/latest/*', { forceNetworkError: true }).as('ratesDown');
      cy.intercept('GET', '**/v1/*..*', { forceNetworkError: true }).as('timeseriesDown');
      cy.reload();

      // Not an outage the user can act on: cached data, marked, no error dialog.
      cy.get('.app-offline').should('not.exist');
      cy.get('app-rates-table app-stale-notice').should('contain', 'could not be reached');
      cy.get('app-sortable-table tbody tr').should('have.length', 5);
      cy.get('app-historical-trends app-stale-notice').should('exist');
      cy.get('app-error-dialog dialog[open]').should('not.exist');
      cy.get('app-rates-table app-error-message').should('not.exist');
    });

    it('shows an error, not a stale notice, when a cold start has no cache', () => {
      cy.clearLocalStorage();
      cy.intercept('GET', '**/v6/latest/*', { forceNetworkError: true }).as('ratesDown');
      cy.visit('/');

      cy.get('app-rates-table app-error-message').should('exist');
      cy.get('app-rates-table app-stale-notice').should('not.exist');
    });
  });
});
