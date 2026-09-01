import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { SignalTableComponent } from './signal-table';
import { SignalService } from '../../services/signal.service';
import { of, throwError } from 'rxjs';
import { Signal } from '@org/signals';

describe('SignalTableComponent', () => {
  const mockSignals: Signal[] = [
    {
      id: '1',
      asset: 'AAPL',
      assetClass: 'equity',
      direction: 'BUY',
      confidence: 82,
      source: 'rsi',
      timestamp: '2026-07-23T09:00:00Z',
    },
    {
      id: '2',
      asset: 'BTC/USD',
      assetClass: 'crypto',
      direction: 'SELL',
      confidence: 71,
      source: 'macd',
      timestamp: '2026-07-23T09:15:00Z',
    },
  ];

  function setup(serviceOverride: Partial<SignalService>) {
    TestBed.configureTestingModule({
      imports: [SignalTableComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: SignalService, useValue: serviceOverride },
      ],
    });
    const fixture = TestBed.createComponent(SignalTableComponent);
    return fixture;
  }

  it('should create', () => {
    const fixture = setup({ getSignals: () => of(mockSignals) });
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should show loading state initially', () => {
    const fixture = setup({ getSignals: () => of(mockSignals) });
    expect(fixture.componentInstance.loading).toBe(true);
  });

  it('should load signals on init', async () => {
    const fixture = setup({ getSignals: () => of(mockSignals) });
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.signals.data.length).toBe(2);
    expect(fixture.componentInstance.loading).toBe(false);
  });

  it('should render table rows', async () => {
    const fixture = setup({ getSignals: () => of(mockSignals) });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const rows = fixture.nativeElement.querySelectorAll('tr.mat-mdc-row');
    expect(rows.length).toBe(2);
  });

  it('should show error state on API failure', async () => {
    const fixture = setup({
      getSignals: () => throwError(() => new Error('API down')),
    });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.componentInstance.error).toBeTruthy();
    expect(fixture.componentInstance.loading).toBe(false);
    const errorCard = fixture.nativeElement.querySelector('.error-card');
    expect(errorCard).toBeTruthy();
  });

  it('should show empty state when no signals', async () => {
    const fixture = setup({ getSignals: () => of([]) });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.componentInstance.signals.data.length).toBe(0);
    const emptyState = fixture.nativeElement.querySelector('.empty-state');
    expect(emptyState).toBeTruthy();
  });

  it('should return correct direction colors', () => {
    const fixture = setup({ getSignals: () => of(mockSignals) });
    const component = fixture.componentInstance;
    expect(component.directionColor('BUY')).toBe('#4caf50');
    expect(component.directionColor('SELL')).toBe('#f44336');
    expect(component.directionColor('HOLD')).toBe('#ff9800');
  });
});
