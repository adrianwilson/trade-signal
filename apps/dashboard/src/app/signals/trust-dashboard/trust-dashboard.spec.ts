import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { TrustDashboardComponent } from './trust-dashboard';

describe('TrustDashboardComponent', () => {
  let component: TrustDashboardComponent;

  beforeEach(() => {
    component = Object.create(TrustDashboardComponent.prototype);
    component.calibration = signal([]);
    component.retrospective = signal(null);
    component.loading = signal(true);
    component.error = signal('');
    Object.assign(component, {
      signalService: {
        getCalibration: vi.fn().mockReturnValue(
          of([
            {
              bucket: '80-100',
              range: [80, 100],
              expectedAccuracy: 0.9,
              actualAccuracy: 0.75,
              total: 4,
              correct: 3,
            },
          ]),
        ),
        getRetrospective: vi.fn().mockReturnValue(
          of({
            totalSignals: 10,
            evaluatedSignals: 8,
            correctSignals: 6,
            overallAccuracy: 0.75,
            hypotheticalTrades: 8,
            hypotheticalPnlPercent: 2.5,
            byDirection: {
              BUY: { count: 5, correct: 4, avgReturn: 3.0 },
              SELL: { count: 3, correct: 2, avgReturn: 1.5 },
            },
          }),
        ),
      },
    });
  });

  describe('ngOnInit', () => {
    it('should load calibration and retrospective data', () => {
      component.ngOnInit();
      expect(component.loading()).toBe(false);
      expect(component.calibration().length).toBe(1);
      expect(component.retrospective()?.overallAccuracy).toBe(0.75);
    });
  });

  describe('calibrationBarWidth', () => {
    it('should return percentage string', () => {
      expect(component.calibrationBarWidth(0.8)).toBe('80%');
    });
  });

  describe('pnlColor', () => {
    it('should return green for positive', () => {
      expect(component.pnlColor(2.5)).toBe('#4caf50');
    });

    it('should return red for negative', () => {
      expect(component.pnlColor(-1.0)).toBe('#f44336');
    });
  });
});
