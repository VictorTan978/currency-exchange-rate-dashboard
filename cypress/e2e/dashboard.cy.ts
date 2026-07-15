/// <reference types="cypress" />

describe('Currency Exchange Rate Dashboard', () => {
  beforeEach(() => {
    // Stub both APIs so the suite is deterministic and offline-safe.
    cy.intercept('GET', '**/v6/latest/*', { fixture: 'rates.json' }).as('rates');
    cy.intercept('GET', '**/v1/currencies', { fixture: 'currencies.json' }).as('currencies');
    cy.intercept('GET', '**/v1/*..*', { fixture: 'timeseries.json' }).as('timeseries');

    cy.visit('/');
    cy.wait('@rates');
  });

  it('shows the exchange rates table with data', () => {
    cy.contains('h2', 'Exchange Rates');
    cy.get('app-sortable-table tbody tr').should('have.length', 5);
    cy.get('app-rates-table').contains('td', 'EUR');
    cy.contains('5 currencies');
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
});
