import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  it('toggles between light and dark', () => {
    const service = TestBed.inject(ThemeService);
    const start = service.theme();
    service.toggle();
    expect(service.theme()).not.toBe(start);
    expect(service.isDark()).toBe(service.theme() === 'dark');
  });

  it('restores a saved theme from localStorage', () => {
    localStorage.setItem('cerd-theme', 'dark');
    const service = TestBed.inject(ThemeService);
    expect(service.theme()).toBe('dark');
    expect(service.isDark()).toBeTrue();
  });

  it('persists the choice and reflects it on the document element', () => {
    const service = TestBed.inject(ThemeService);
    service.set('dark');
    TestBed.inject(ApplicationRef).tick(); // flush the effect

    expect(localStorage.getItem('cerd-theme')).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});
