import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { signal, computed } from '@angular/core';
import { SynthesisViewComponent } from './synthesis-view';
import type { AggregatedSignal } from '@org/signals';

describe('SynthesisViewComponent', () => {
  let component: SynthesisViewComponent;
  let mockSignalService: { getSynthesis: ReturnType<typeof vi.fn> };

  const mockSyntheses: AggregatedSignal[] = [
    {
      asset: 'AAPL',
      assetClass: 'equity',
      price: 0,
      priceChange: 0,
      direction: 'BUY',
      confidence: 75,
      signals: [],
      contributions: [
        { source: 'rsi', direction: 'BUY', confidence: 80 },
        { source: 'macd', direction: 'BUY', confidence: 70 },
      ],
      agreements: ['RSI and MACD agree: BUY'],
      disagreements: [],
      reasoningChain: 'AAPL: BUY with 75% confidence based on 2 agents.',
      reasoningSource: 'template' as const,
      conviction: 80,
      convictionLabel: 'strong' as const,
      lastUpdated: '2026-09-02T10:00:00Z',
    },
  ];

  beforeEach(() => {
    mockSignalService = {
      getSynthesis: vi.fn().mockReturnValue(of(mockSyntheses)),
    };

    component = Object.create(SynthesisViewComponent.prototype);
    component.allSyntheses = signal<AggregatedSignal[]>([]);
    component.selectedClass = signal('all');
    component.loading = signal(true);
    component.refreshing = signal(false);
    component.error = signal('');
    component.syntheses = computed(() => {
      const filter = component.selectedClass();
      const all = component.allSyntheses();
      if (filter === 'all') return all;
      return all.filter((s) => s.assetClass === filter);
    });
    component.assetClasses = computed(() => {
      const classes = new Set(
        component.allSyntheses().map((s) => s.assetClass),
      );
      return ['all', ...Array.from(classes)];
    });
    component.selectedTimeframe = signal('all');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (component as any)['timeframes'] = [
      'all',
      'intraday',
      'swing',
      'long-term',
    ];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (component as any)['timeframeLabels'] = {
      all: 'All',
      intraday: 'Intraday (1H)',
      swing: 'Swing (1D)',
      'long-term': 'Long-term (1W)',
    };
    component.paperAccountId = signal<string | null>(null);
    component.followedAssets = signal(new Set<string>());
    component.followingInProgress = signal(new Set<string>());
    component.closingInProgress = signal(new Set<string>());
    Object.assign(component, {
      signalService: mockSignalService,
      authService: { isAuthenticated: () => false },
    });
  });

  describe('ngOnInit', () => {
    it('should load synthesis data', () => {
      component.ngOnInit();
      expect(component.loading()).toBe(false);
      expect(component.syntheses().length).toBe(1);
      expect(component.syntheses()[0].asset).toBe('AAPL');
    });

    it('should handle error', () => {
      mockSignalService.getSynthesis.mockReturnValue(
        throwError(() => new Error('fail')),
      );
      component.ngOnInit();
      expect(component.loading()).toBe(false);
      expect(component.error()).toContain('Failed to load');
    });
  });

  describe('refresh', () => {
    it('should reload data', () => {
      component.refresh();
      expect(component.refreshing()).toBe(false);
      expect(component.syntheses().length).toBe(1);
    });
  });

  describe('filtering', () => {
    it('should filter by asset class', () => {
      component.allSyntheses.set(mockSyntheses);
      component.selectedClass.set('equity');
      expect(component.syntheses().length).toBe(1);
      component.selectedClass.set('crypto');
      expect(component.syntheses().length).toBe(0);
    });
  });

  describe('timeframe selection', () => {
    it('should default to all', () => {
      expect(component.selectedTimeframe()).toBe('all');
    });

    it('should call getSynthesis with timeframe on change', () => {
      component.onTimeframeChange('swing');
      expect(component.selectedTimeframe()).toBe('swing');
      expect(mockSignalService.getSynthesis).toHaveBeenCalledWith('swing');
    });
  });

  describe('closePosition', () => {
    it('should remove asset from followedAssets on success', () => {
      const mockClose = vi.fn().mockReturnValue(of([]));
      Object.assign(component, {
        signalService: { ...mockSignalService, closePaperPosition: mockClose },
      });
      component.paperAccountId.set('acc-1');
      component.followedAssets.set(new Set(['AAPL']));

      component.closePosition(mockSyntheses[0]);

      expect(component.followedAssets().has('AAPL')).toBe(false);
      expect(mockClose).toHaveBeenCalledWith('acc-1', 'AAPL');
    });

    it('should not call service without account', () => {
      const mockClose = vi.fn().mockReturnValue(of([]));
      Object.assign(component, {
        signalService: { ...mockSignalService, closePaperPosition: mockClose },
      });
      component.paperAccountId.set(null);

      component.closePosition(mockSyntheses[0]);

      expect(mockClose).not.toHaveBeenCalled();
    });
  });

  describe('directionColor', () => {
    it('should return green for BUY', () => {
      expect(component.directionColor('BUY')).toBe('#4caf50');
    });

    it('should return red for SELL', () => {
      expect(component.directionColor('SELL')).toBe('#f44336');
    });

    it('should return orange for HOLD', () => {
      expect(component.directionColor('HOLD')).toBe('#ff9800');
    });
  });
});
