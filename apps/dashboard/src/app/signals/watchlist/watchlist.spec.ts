import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { signal, computed } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { WatchlistComponent } from './watchlist';

describe('WatchlistComponent', () => {
  let component: WatchlistComponent;
  let mockSignalService: {
    getWatchlist: ReturnType<typeof vi.fn>;
    getSynthesis: ReturnType<typeof vi.fn>;
    removeFromWatchlist: ReturnType<typeof vi.fn>;
  };
  let mockAuthService: {
    isAuthenticated: ReturnType<typeof computed>;
  };

  const mockItems = [
    {
      id: '1',
      asset: 'AAPL',
      assetClass: 'equity',
      addedAt: '2026-09-01T10:00:00Z',
    },
  ];

  beforeEach(() => {
    mockSignalService = {
      getWatchlist: vi.fn().mockReturnValue(of(mockItems)),
      getSynthesis: vi.fn().mockReturnValue(of([])),
      removeFromWatchlist: vi.fn().mockReturnValue(of(undefined)),
    };
    const authToken = signal('token');
    mockAuthService = {
      isAuthenticated: computed(() => !!authToken()),
    };

    component = Object.create(WatchlistComponent.prototype);
    component.watchlist = new MatTableDataSource<any>([]);
    component.loading = signal(true);
    component.error = signal('');
    Object.assign(component, {
      signalService: mockSignalService,
      authService: mockAuthService,
    });
  });

  describe('ngOnInit', () => {
    it('should load watchlist', () => {
      component.ngOnInit();
      expect(component.loading()).toBe(false);
      expect(component.watchlist.data.length).toBe(1);
    });

    it('should show error when not authenticated', () => {
      const noAuth = signal<string | null>(null);
      Object.assign(component, {
        authService: { isAuthenticated: computed(() => !!noAuth()) },
      });
      component.ngOnInit();
      expect(component.error()).toContain('login');
    });

    it('should handle API error', () => {
      mockSignalService.getWatchlist.mockReturnValue(
        throwError(() => new Error('fail')),
      );
      component.ngOnInit();
      expect(component.error()).toContain('Failed');
    });
  });

  describe('remove', () => {
    it('should remove asset from watchlist', () => {
      component.watchlist.data = [...mockItems];
      component.remove('AAPL');
      expect(component.watchlist.data.length).toBe(0);
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
});
