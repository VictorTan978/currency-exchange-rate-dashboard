import { TestBed } from '@angular/core/testing';

import { ConnectivityService } from './connectivity.service';
import { goOffline, goOnline } from '../../../testing/connectivity';

describe('ConnectivityService', () => {
  let service: ConnectivityService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [ConnectivityService] });
    service = TestBed.inject(ConnectivityService);
  });

  afterEach(() => goOnline());

  it('starts from the browser connection state', () => {
    // Karma runs against a served page, so the browser reports online.
    expect(service.online()).toBe(navigator.onLine);
  });

  it('flips to offline when the connection drops', () => {
    goOffline();

    expect(service.online()).toBeFalse();
    expect(service.offline()).toBeTrue();
  });

  it('recovers when the connection returns', () => {
    goOffline();
    goOnline();

    expect(service.online()).toBeTrue();
    expect(service.offline()).toBeFalse();
  });
});
