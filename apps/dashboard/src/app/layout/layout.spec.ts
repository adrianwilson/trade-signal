import { describe, it, expect, beforeEach, vi } from 'vitest';
import { signal } from '@angular/core';
import { LayoutComponent } from './layout';

describe('LayoutComponent', () => {
  let component: LayoutComponent;

  beforeEach(() => {
    component = Object.create(LayoutComponent.prototype);
    component.unreadCount = signal(0);
    component.alerts = signal([]);
    Object.assign(component, {
      authService: {
        isAuthenticated: () => false,
        user: () => null,
      },
      signalService: {
        generateAlerts: vi.fn().mockReturnValue({ subscribe: vi.fn() }),
        getAlerts: vi.fn().mockReturnValue({ subscribe: vi.fn() }),
        getUnreadAlertCount: vi.fn().mockReturnValue({ subscribe: vi.fn() }),
        markAllAlertsAsRead: vi.fn().mockReturnValue({ subscribe: vi.fn() }),
      },
    });
  });

  it('should return correct direction colors', () => {
    expect(component.directionColor('BUY')).toBe('#4caf50');
    expect(component.directionColor('SELL')).toBe('#f44336');
    expect(component.directionColor('HOLD')).toBe('#ff9800');
  });

  it('should not load alerts when not authenticated', () => {
    component.ngOnInit();
    expect(component.alerts().length).toBe(0);
  });
});
