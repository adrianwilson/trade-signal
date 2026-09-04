import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';
import { OpportunitiesComponent } from './opportunities';
import type { Opportunity } from '../../services/signal.service';

describe('OpportunitiesComponent', () => {
  let component: OpportunitiesComponent;
  let mockSignalService: { getOpportunities: ReturnType<typeof vi.fn> };

  const mockData: Opportunity[] = [
    {
      asset: 'NVDA',
      assetClass: 'equity',
      direction: 'BUY',
      confidence: 75,
      rsi: 28,
      macdSignal: 'BUY',
      smaSignal: 'BUY',
      bollingerSignal: 'HOLD',
      price: 450,
      changePercent: 2.5,
      scannedAt: '2026-09-04T10:00:00Z',
    },
  ];

  beforeEach(() => {
    mockSignalService = {
      getOpportunities: vi.fn().mockReturnValue(of(mockData)),
    };

    component = Object.create(OpportunitiesComponent.prototype);
    component.opportunities = signal<Opportunity[]>([]);
    component.loading = signal(true);
    component.error = signal('');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (component as any)['displayedColumns'] = [
      'rank',
      'asset',
      'direction',
      'confidence',
      'rsi',
      'macd',
      'price',
      'change',
    ];
    Object.assign(component, { signalService: mockSignalService });
  });

  describe('ngOnInit', () => {
    it('should load opportunities', () => {
      component.ngOnInit();
      expect(component.loading()).toBe(false);
      expect(component.opportunities().length).toBe(1);
      expect(component.opportunities()[0].asset).toBe('NVDA');
    });

    it('should handle error', () => {
      mockSignalService.getOpportunities.mockReturnValue(
        throwError(() => new Error('fail')),
      );
      component.ngOnInit();
      expect(component.loading()).toBe(false);
      expect(component.error()).toContain('Failed to load');
    });
  });

  describe('directionColor', () => {
    it('should return green for BUY', () => {
      expect(component.directionColor('BUY')).toBe('#4caf50');
    });

    it('should return red for SELL', () => {
      expect(component.directionColor('SELL')).toBe('#f44336');
    });
  });

  describe('changeColor', () => {
    it('should return green for positive', () => {
      expect(component.changeColor(2.5)).toBe('#4caf50');
    });

    it('should return red for negative', () => {
      expect(component.changeColor(-1.2)).toBe('#f44336');
    });

    it('should return grey for null', () => {
      expect(component.changeColor(null)).toBe('#9e9e9e');
    });
  });
});
