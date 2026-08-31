import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { SignalTableComponent } from './signal-table';
import { SignalService } from '../../services/signal.service';
import { of } from 'rxjs';
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

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SignalTableComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: SignalService,
          useValue: { getSignals: () => of(mockSignals) },
        },
      ],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(SignalTableComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should load signals on init', async () => {
    const fixture = TestBed.createComponent(SignalTableComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.signals.data.length).toBe(2);
  });

  it('should render table rows', async () => {
    const fixture = TestBed.createComponent(SignalTableComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const rows = fixture.nativeElement.querySelectorAll('tr.mat-mdc-row');
    expect(rows.length).toBe(2);
  });

  it('should return correct direction colors', () => {
    const fixture = TestBed.createComponent(SignalTableComponent);
    const component = fixture.componentInstance;
    expect(component.directionColor('BUY')).toBe('#4caf50');
    expect(component.directionColor('SELL')).toBe('#f44336');
    expect(component.directionColor('HOLD')).toBe('#ff9800');
  });
});
