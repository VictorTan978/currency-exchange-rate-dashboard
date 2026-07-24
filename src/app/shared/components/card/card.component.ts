import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Reusable surface/section wrapper with a title and optional header actions. */
@Component({
  selector: 'app-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="card">
      <header class="card__head">
        <div class="card__titles">
          <h2 class="card__title">{{ title() }}</h2>
          @if (subtitle()) {
            <p class="card__subtitle">{{ subtitle() }}</p>
          }
        </div>
        <div class="card__actions">
          <ng-content select="[card-actions]" />
        </div>
      </header>
      <div class="card__body">
        <ng-content />
      </div>
    </section>
  `,
  styles: [
    `
      .card {
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius);
        box-shadow: var(--shadow-md);
        padding: 1.25rem 1.25rem 1.4rem;
        height: 100%;
      }
      .card__head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 1rem;
        flex-wrap: wrap;
        margin-bottom: 1rem;
      }
      .card__title {
        font-size: 1.05rem;
        margin: 0;
      }
      .card__subtitle {
        margin: 0.15rem 0 0;
        font-size: 0.85rem;
        color: var(--color-text-muted);
      }
      .card__titles {
        min-width: 0;
      }
      .card__actions {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-wrap: wrap;
        /* Keep header controls (selects, date ranges) inside the card instead of
           letting their intrinsic width push past its edge. */
        min-width: 0;
        max-width: 100%;
      }
      @media (max-width: 620px) {
        .card__head {
          flex-direction: column;
          align-items: stretch;
        }
        .card__actions {
          width: 100%;
        }
      }
    `,
  ],
})
export class CardComponent {
  readonly title = input.required<string>();
  readonly subtitle = input('');
}
