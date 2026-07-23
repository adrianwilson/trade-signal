import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { SignalService } from './signal.service';
import { Signal } from '@org/signals';

describe('SignalService', () => {
  let service: SignalService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SignalService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should fetch all signals', () => {
    const mockSignals: Signal[] = [
      {
        id: '1',
        asset: 'AAPL',
        assetClass: 'equity',
        direction: 'BUY',
        confidence: 80,
        source: 'rsi',
        timestamp: '2026-07-23T09:00:00Z',
      },
    ];

    service.getSignals().subscribe((signals) => {
      expect(signals).toEqual(mockSignals);
    });

    const req = httpTesting.expectOne('http://localhost:3000/api/signals');
    expect(req.request.method).toBe('GET');
    req.flush(mockSignals);
  });

  it('should fetch a single signal', () => {
    const mockSignal: Signal = {
      id: '1',
      asset: 'AAPL',
      assetClass: 'equity',
      direction: 'BUY',
      confidence: 80,
      source: 'rsi',
      timestamp: '2026-07-23T09:00:00Z',
    };

    service.getSignal('1').subscribe((signal) => {
      expect(signal).toEqual(mockSignal);
    });

    const req = httpTesting.expectOne('http://localhost:3000/api/signals/1');
    expect(req.request.method).toBe('GET');
    req.flush(mockSignal);
  });

  it('should create a signal', () => {
    const input = {
      asset: 'GOOG',
      assetClass: 'equity' as const,
      direction: 'SELL' as const,
      confidence: 65,
    };
    const mockResponse: Signal = {
      ...input,
      id: '99',
      source: 'manual',
      timestamp: '2026-07-23T12:00:00Z',
    };

    service.createSignal(input).subscribe((signal) => {
      expect(signal).toEqual(mockResponse);
    });

    const req = httpTesting.expectOne('http://localhost:3000/api/signals');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(input);
    req.flush(mockResponse);
  });
});
