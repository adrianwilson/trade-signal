import { of, throwError } from 'rxjs';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AssetDetailComponent } from './asset-detail';

describe('AssetDetailComponent', () => {
  let component: AssetDetailComponent;
  let mockDialogRef: { close: ReturnType<typeof vi.fn> };
  let mockSignalService: { getAnalysis: ReturnType<typeof vi.fn> };

  const mockAnalysis = {
    symbol: 'AAPL',
    rsi: 45.2,
    rsiSignal: 'HOLD',
    macd: { line: 0.5, signal: 0.3, histogram: 0.2 },
    macdSignal: 'BUY',
    sma20: 150.5,
    sma50: 148.3,
    sma200: 145.0,
    ema20: 150.2,
    bollingerPercentB: 0.65,
    bollingerSignal: 'HOLD',
    crossover: { type: 'none', occurred: false },
    smaSignal: 'HOLD',
    overallSignal: 'HOLD',
  };

  beforeEach(() => {
    mockDialogRef = { close: vi.fn() };
    mockSignalService = { getAnalysis: vi.fn() };

    component = new AssetDetailComponent(
      { asset: 'AAPL', assetClass: 'equity', price: 150, changePercent: 1.5 },
      mockDialogRef as any,
      mockSignalService as any,
    );
  });

  describe('ngOnInit', () => {
    it('should load analysis data', () => {
      mockSignalService.getAnalysis.mockReturnValue(of(mockAnalysis));
      component.ngOnInit();
      expect(component.loading).toBe(false);
      expect(component.analysis).toBeTruthy();
      expect(component.analysis!.rsi).toBe(45.2);
    });

    it('should handle error', () => {
      mockSignalService.getAnalysis.mockReturnValue(
        throwError(() => new Error('fail')),
      );
      component.ngOnInit();
      expect(component.loading).toBe(false);
      expect(component.error).toBe('Failed to load analysis data.');
    });
  });

  describe('close', () => {
    it('should close the dialog', () => {
      component.close();
      expect(mockDialogRef.close).toHaveBeenCalled();
    });
  });

  describe('ngOnDestroy', () => {
    it('should not throw when no chart exists', () => {
      expect(() => component.ngOnDestroy()).not.toThrow();
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

  describe('rsiZone', () => {
    it('should return Oversold when RSI < 30', () => {
      expect(component.rsiZone(25)).toBe('Oversold');
    });

    it('should return Overbought when RSI > 70', () => {
      expect(component.rsiZone(75)).toBe('Overbought');
    });

    it('should return Neutral when RSI is between 30-70', () => {
      expect(component.rsiZone(50)).toBe('Neutral');
    });

    it('should return N/A for null', () => {
      expect(component.rsiZone(null)).toBe('N/A');
    });
  });

  describe('bollingerZone', () => {
    it('should return Near lower band when %B < 0.2', () => {
      expect(component.bollingerZone(0.1)).toBe('Near lower band');
    });

    it('should return Near upper band when %B > 0.8', () => {
      expect(component.bollingerZone(0.9)).toBe('Near upper band');
    });

    it('should return Within bands for mid-range', () => {
      expect(component.bollingerZone(0.5)).toBe('Within bands');
    });

    it('should return N/A for null', () => {
      expect(component.bollingerZone(null)).toBe('N/A');
    });
  });
});
