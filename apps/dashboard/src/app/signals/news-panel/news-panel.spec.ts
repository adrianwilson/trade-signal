import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';
import { NewsPanelComponent } from './news-panel';
import type { AssetSentiment } from '../../services/signal.service';

describe('NewsPanelComponent', () => {
  let component: NewsPanelComponent;
  let mockSignalService: { getNewsSentiment: ReturnType<typeof vi.fn> };

  const mockSentiments: AssetSentiment[] = [
    {
      asset: 'AAPL',
      score: 0.45,
      signal: 'BUY',
      headlineCount: 5,
      headlines: [
        {
          title: 'Apple stock surges on earnings beat',
          source: 'Reuters',
          url: 'https://example.com/1',
          publishedAt: '2026-09-01T10:00:00Z',
        },
      ],
    },
  ];

  beforeEach(() => {
    mockSignalService = {
      getNewsSentiment: vi.fn().mockReturnValue(of(mockSentiments)),
    };

    component = Object.create(NewsPanelComponent.prototype);
    component.sentiments = signal<AssetSentiment[]>([]);
    component.loading = signal(true);
    component.refreshing = signal(false);
    component.error = signal('');
    Object.assign(component, {
      signalService: mockSignalService,
      retryCount: 0,
      retryTimer: null,
    });
  });

  describe('ngOnInit', () => {
    it('should load sentiment data', () => {
      component.ngOnInit();
      expect(component.loading()).toBe(false);
      expect(component.sentiments().length).toBe(1);
      expect(component.sentiments()[0].asset).toBe('AAPL');
    });

    it('should handle error', () => {
      mockSignalService.getNewsSentiment.mockReturnValue(
        throwError(() => new Error('fail')),
      );
      component.ngOnInit();
      expect(component.loading()).toBe(false);
      expect(component.error()).toBe(
        'Failed to load news sentiment. Is the API running?',
      );
    });
  });

  describe('refresh', () => {
    it('should set refreshing and reload data', () => {
      component.refresh();
      expect(component.refreshing()).toBe(false);
      expect(component.sentiments().length).toBe(1);
    });
  });

  describe('signalColor', () => {
    it('should return green for BUY', () => {
      expect(component.signalColor('BUY')).toBe('#4caf50');
    });

    it('should return red for SELL', () => {
      expect(component.signalColor('SELL')).toBe('#f44336');
    });

    it('should return orange for HOLD', () => {
      expect(component.signalColor('HOLD')).toBe('#ff9800');
    });
  });

  describe('sentimentIcon', () => {
    it('should return trending_up for positive', () => {
      expect(component.sentimentIcon(0.5)).toBe('trending_up');
    });

    it('should return trending_down for negative', () => {
      expect(component.sentimentIcon(-0.5)).toBe('trending_down');
    });

    it('should return trending_flat for neutral', () => {
      expect(component.sentimentIcon(0)).toBe('trending_flat');
    });
  });

  describe('sentimentColor', () => {
    it('should return green for positive', () => {
      expect(component.sentimentColor(0.5)).toBe('#4caf50');
    });

    it('should return red for negative', () => {
      expect(component.sentimentColor(-0.5)).toBe('#f44336');
    });

    it('should return orange for neutral', () => {
      expect(component.sentimentColor(0)).toBe('#ff9800');
    });
  });
});
