import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { LeaderboardComponent } from './leaderboard';
import type { LeaderboardEntry } from '../../services/signal.service';

describe('LeaderboardComponent', () => {
  let component: LeaderboardComponent;

  const mockData: LeaderboardEntry[] = [
    {
      rank: 1,
      source: 'rsi',
      total: 10,
      correct: 8,
      incorrect: 2,
      pending: 0,
      accuracyRate: 0.8,
    },
    {
      rank: 2,
      source: 'macd',
      total: 10,
      correct: 5,
      incorrect: 5,
      pending: 0,
      accuracyRate: 0.5,
    },
  ];

  beforeEach(() => {
    component = Object.create(LeaderboardComponent.prototype);
    component.leaderboard = new MatTableDataSource<LeaderboardEntry>([]);
    component.loading = signal(true);
    component.error = signal('');
    Object.assign(component, {
      signalService: {
        getLeaderboard: vi.fn().mockReturnValue(of(mockData)),
      },
    });
  });

  describe('ngOnInit', () => {
    it('should load leaderboard data', () => {
      component.ngOnInit();
      expect(component.loading()).toBe(false);
      expect(component.leaderboard.data.length).toBe(2);
      expect(component.leaderboard.data[0].source).toBe('rsi');
    });
  });

  describe('rankIcon', () => {
    it('should return trophy for rank 1', () => {
      expect(component.rankIcon(1)).toBe('emoji_events');
    });

    it('should return empty for rank > 3', () => {
      expect(component.rankIcon(4)).toBe('');
    });
  });

  describe('accuracyColor', () => {
    it('should return green for >= 70%', () => {
      expect(component.accuracyColor(0.8)).toBe('#4caf50');
    });

    it('should return orange for >= 50%', () => {
      expect(component.accuracyColor(0.6)).toBe('#ff9800');
    });

    it('should return red for < 50%', () => {
      expect(component.accuracyColor(0.3)).toBe('#f44336');
    });
  });
});
