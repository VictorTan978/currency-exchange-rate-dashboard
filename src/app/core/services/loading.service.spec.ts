import { TestBed } from '@angular/core/testing';

import { LoadingService } from './loading.service';

describe('LoadingService', () => {
  let service: LoadingService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LoadingService);
  });

  it('is not loading initially', () => {
    expect(service.loading()).toBe(false);
  });

  it('loads while a request is in flight', () => {
    service.start();
    expect(service.loading()).toBe(true);
    service.stop();
    expect(service.loading()).toBe(false);
  });

  it('stays loading until every concurrent request has stopped', () => {
    service.start();
    service.start();
    service.stop();
    expect(service.loading()).toBe(true);
    service.stop();
    expect(service.loading()).toBe(false);
  });

  it('keeps the first message while requests overlap', () => {
    service.start('Loading exchange rates…');
    service.start('Loading historical rates…');
    expect(service.message()).toBe('Loading exchange rates…');
  });

  it('ignores a stop with nothing in flight', () => {
    service.stop();
    expect(service.loading()).toBe(false);

    service.start();
    expect(service.loading()).toBe(true);
  });
});
