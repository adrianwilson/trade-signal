import { Component, OnInit, inject, signal } from '@angular/core';
import { PercentPipe } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { SignalService, LeaderboardEntry } from '../../services/signal.service';

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [
    MatTableModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatButtonToggleModule,
    PercentPipe,
  ],
  templateUrl: './leaderboard.html',
  styleUrl: './leaderboard.scss',
})
export class LeaderboardComponent implements OnInit {
  private readonly signalService = inject(SignalService);

  displayedColumns = [
    'rank',
    'source',
    'trend',
    'accuracyRate',
    'correct',
    'incorrect',
    'pending',
    'total',
  ];
  leaderboard: MatTableDataSource<LeaderboardEntry> =
    new MatTableDataSource<LeaderboardEntry>([]);
  loading = signal(true);
  error = signal('');
  activeWindow = signal<number | undefined>(undefined);

  ngOnInit(): void {
    this.loadData();
  }

  setWindow(days: number | undefined): void {
    this.activeWindow.set(days);
    this.loading.set(true);
    this.loadData();
  }

  private loadData(): void {
    this.signalService.getLeaderboard(this.activeWindow()).subscribe({
      next: (data) => {
        this.leaderboard.data = data;
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load leaderboard.');
        this.loading.set(false);
      },
    });
  }

  rankIcon(rank: number): string {
    if (rank === 1) return 'emoji_events';
    if (rank === 2) return 'military_tech';
    if (rank === 3) return 'workspace_premium';
    return '';
  }

  accuracyColor(rate: number): string {
    if (rate >= 0.7) return '#4caf50';
    if (rate >= 0.5) return '#ff9800';
    return '#f44336';
  }

  trendIcon(trend: string | null): string {
    if (trend === 'hot') return 'local_fire_department';
    if (trend === 'cold') return 'ac_unit';
    return '';
  }

  trendColor(trend: string | null): string {
    if (trend === 'hot') return '#f44336';
    if (trend === 'cold') return '#2196f3';
    return '#9e9e9e';
  }
}
