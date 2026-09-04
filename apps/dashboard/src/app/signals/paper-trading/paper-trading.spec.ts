import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of } from 'rxjs';
import { signal, computed } from '@angular/core';
import { PaperTradingComponent } from './paper-trading';

describe('PaperTradingComponent', () => {
  let component: PaperTradingComponent;

  beforeEach(() => {
    const authToken = signal('token');
    component = Object.create(PaperTradingComponent.prototype);
    component.account = signal(null);
    component.performance = signal(null);
    component.trades = signal([]);
    component.loading = signal(true);
    component.error = signal('');
    Object.assign(component, {
      signalService: {
        getPaperAccounts: vi.fn().mockReturnValue(of([])),
        createPaperAccount: vi
          .fn()
          .mockReturnValue(
            of({ id: 'acc-1', cashBalance: 100000, startingBalance: 100000 }),
          ),
        getPaperAccountSummary: vi.fn().mockReturnValue(
          of({
            id: 'acc-1',
            totalValue: 100000,
            totalReturn: 0,
            cashBalance: 100000,
            startingBalance: 100000,
            openPositions: [],
          }),
        ),
        getPaperPerformance: vi.fn().mockReturnValue(
          of({
            totalValue: 100000,
            totalReturn: 0,
            winRate: 0,
            totalTrades: 0,
            closedTrades: 0,
            openPositionCount: 0,
            bySource: {},
          }),
        ),
        getPaperTrades: vi.fn().mockReturnValue(of([])),
      },
      authService: { isAuthenticated: computed(() => !!authToken()) },
    });
  });

  describe('ngOnInit', () => {
    it('should load accounts', () => {
      component.ngOnInit();
      expect(component.loading()).toBe(false);
    });
  });

  describe('createAccount', () => {
    it('should create paper account', () => {
      component.createAccount();
      expect(component.account()).not.toBeNull();
    });
  });

  describe('pnlColor', () => {
    it('should return green for positive', () => {
      expect(component.pnlColor(100)).toBe('#4caf50');
    });

    it('should return red for negative', () => {
      expect(component.pnlColor(-50)).toBe('#f44336');
    });

    it('should return gray for null', () => {
      expect(component.pnlColor(null)).toBe('#9e9e9e');
    });
  });
});
