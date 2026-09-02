import { Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe, PercentPipe } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
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
    DecimalPipe,
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

  ngOnInit(): void {
    this.signalService.getLeaderboard().subscribe({
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
}
