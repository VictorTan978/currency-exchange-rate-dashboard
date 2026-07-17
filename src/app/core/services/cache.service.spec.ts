import { TestBed } from '@angular/core/testing';

import { CacheService } from './cache.service';
import { CACHE_VERSION } from '../models/cache.model';

describe('CacheService', () => {
  let service: CacheService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [CacheService] });
    service = TestBed.inject(CacheService);
  });

  afterEach(() => localStorage.clear());

  it('round-trips a payload with the time it was cached', () => {
    service.write('thing', { a: 1, b: ['x'] });

    const entry = service.read<{ a: number; b: string[] }>('thing');

    expect(entry!.payload).toEqual({ a: 1, b: ['x'] });
    expect(entry!.cachedAt).toBeInstanceOf(Date);
  });

  it('returns null for a key that was never written', () => {
    expect(service.read('absent')).toBeNull();
  });

  it('applies the revive function to the parsed payload', () => {
    service.write('dated', { at: new Date(1_700_000_000_000) });

    const entry = service.read<{ at: Date }>('dated', (payload) => {
      const raw = payload as { at: string };
      return { at: new Date(raw.at) };
    });

    expect(entry!.payload.at).toEqual(new Date(1_700_000_000_000));
  });

  it('namespaces its keys so it cannot collide with other storage', () => {
    service.write('thing', 1);

    expect(localStorage.getItem('cerd-cache:thing')).toBeTruthy();
    expect(localStorage.getItem('thing')).toBeNull();
  });

  it('discards an entry written by a different schema version', () => {
    service.write('thing', { a: 1 });
    const stored = JSON.parse(localStorage.getItem('cerd-cache:thing')!);
    localStorage.setItem(
      'cerd-cache:thing',
      JSON.stringify({ ...stored, version: CACHE_VERSION + 1 }),
    );

    expect(service.read('thing')).toBeNull();
    // Dropped, not just ignored, so it can't fail the same way again.
    expect(localStorage.getItem('cerd-cache:thing')).toBeNull();
  });

  it('discards a corrupt entry instead of throwing', () => {
    localStorage.setItem('cerd-cache:thing', 'not json{');

    expect(() => service.read('thing')).not.toThrow();
    expect(service.read('thing')).toBeNull();
  });

  it('clear() removes its own keys and leaves others alone', () => {
    service.write('thing', 1);
    localStorage.setItem('cerd-theme', 'dark');

    service.clear();

    expect(service.read('thing')).toBeNull();
    expect(localStorage.getItem('cerd-theme')).toBe('dark');
  });

  it('evicts and retries once when the quota is exceeded', () => {
    service.write('old', 'evict me');
    let firstAttempt = true;
    const setItem = spyOn(Storage.prototype, 'setItem').and.callFake(function (
      this: Storage,
      key: string,
      value: string,
    ) {
      if (firstAttempt) {
        firstAttempt = false;
        throw new DOMException('quota', 'QuotaExceededError');
      }
      setItem.and.callThrough();
      this.setItem(key, value);
    });

    service.write('new', 'keep me');

    expect(service.read<string>('new')!.payload).toBe('keep me');
    expect(service.read('old')).toBeNull();
  });

  it('gives up quietly when storage is unusable', () => {
    spyOn(Storage.prototype, 'setItem').and.throwError('storage disabled');
    spyOn(Storage.prototype, 'getItem').and.throwError('storage disabled');

    // Caching is an enhancement: a dead backend must not surface to callers.
    expect(() => service.write('thing', 1)).not.toThrow();
    expect(() => service.read('thing')).not.toThrow();
    expect(service.read('thing')).toBeNull();
  });
});
