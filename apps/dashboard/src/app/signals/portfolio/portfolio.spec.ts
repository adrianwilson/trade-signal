import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of } from 'rxjs';
import { signal, computed } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { PortfolioComponent } from './portfolio';

describe('PortfolioComponent', () => {
  let component: PortfolioComponent;
  let mockSignalService: {
    getPortfolio: ReturnType<typeof vi.fn>;
    getMarketQuotes: ReturnType<typeof vi.fn>;
    getSynthesis: ReturnType<typeof vi.fn>;
    addPortfolioPosition: ReturnType<typeof vi.fn>;
    removePortfolioPosition: ReturnType<typeof vi.fn>;
  };

  const mockPositions = [
    {
      id: '1',
      asset: 'AAPL',
      assetClass: 'equity',
      quantity: 10,
      avgPrice: 150,
      addedAt: '2026-09-01T10:00:00Z',
    },
  ];

  beforeEach(() => {
    mockSignalService = {
      getPortfolio: vi.fn().mockReturnValue(of(mockPositions)),
      getMarketQuotes: vi.fn().mockReturnValue(of({})),
      getSynthesis: vi.fn().mockReturnValue(of([])),
      addPortfolioPosition: vi.fn().mockReturnValue(of(mockPositions[0])),
      removePortfolioPosition: vi.fn().mockReturnValue(of(undefined)),
    };
    const authToken = signal('token');

    component = Object.create(PortfolioComponent.prototype);
    component.portfolio = new MatTableDataSource<any>([]);
    component.loading = signal(true);
    component.error = signal('');
    component.showAddForm = signal(false);
    component.newAsset = '';
    component.newQuantity = 0;
    component.newAvgPrice = 0;
    Object.assign(component, {
      signalService: mockSignalService,
      authService: { isAuthenticated: computed(() => !!authToken()) },
    });
  });

  describe('ngOnInit', () => {
    it('should load portfolio', () => {
      component.ngOnInit();
      expect(component.loading()).toBe(false);
      expect(component.portfolio.data.length).toBe(1);
    });

    it('should show error when not authenticated', () => {
      const noAuth = signal<string | null>(null);
      Object.assign(component, {
        authService: { isAuthenticated: computed(() => !!noAuth()) },
      });
      component.ngOnInit();
      expect(component.error()).toContain('login');
    });
  });

  describe('removePosition', () => {
    it('should remove from table', () => {
      component.portfolio.data = [...mockPositions] as any;
      component.removePosition('AAPL');
      expect(component.portfolio.data.length).toBe(0);
    });
  });

  describe('directionColor', () => {
    it('should return correct colors', () => {
      expect(component.directionColor('BUY')).toBe('#4caf50');
      expect(component.directionColor('SELL')).toBe('#f44336');
      expect(component.directionColor('HOLD')).toBe('#ff9800');
    });
  });

  describe('pnlColor', () => {
    it('should return green for positive P&L', () => {
      expect(component.pnlColor(100)).toBe('#4caf50');
    });

    it('should return red for negative P&L', () => {
      expect(component.pnlColor(-50)).toBe('#f44336');
    });
  });
});
