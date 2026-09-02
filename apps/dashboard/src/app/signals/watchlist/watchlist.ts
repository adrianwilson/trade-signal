import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { SignalService, WatchlistItem } from '../../services/signal.service';
import { AuthService } from '../../services/auth.service';
import type { AggregatedSignal } from '@org/signals';

@Component({
  selector: 'app-watchlist',
  standalone: true,
  imports: [
    MatTableModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    DatePipe,
  ],
  templateUrl: './watchlist.html',
  styleUrl: './watchlist.scss',
})
export class WatchlistComponent implements OnInit {
  private readonly signalService = inject(SignalService);
  readonly authService = inject(AuthService);

  displayedColumns = [
    'asset',
    'assetClass',
    'direction',
    'confidence',
    'addedAt',
    'actions',
  ];
  watchlist: MatTableDataSource<
    WatchlistItem & { synthesis?: AggregatedSignal }
  > = new MatTableDataSource<WatchlistItem & { synthesis?: AggregatedSignal }>(
    [],
  );
  loading = signal(true);
  error = signal('');

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      this.error.set('Please login to view your watchlist.');
      this.loading.set(false);
      return;
    }
    this.loadData();
  }

  private loadData(): void {
    this.signalService.getWatchlist().subscribe({
      next: (items) => {
        this.watchlist.data = items;
        this.loading.set(false);
        this.loadSynthesis();
      },
      error: () => {
        this.error.set('Failed to load watchlist.');
        this.loading.set(false);
      },
    });
  }

  private loadSynthesis(): void {
    this.signalService.getSynthesis().subscribe({
      next: (syntheses) => {
        const synthMap = new Map(syntheses.map((s) => [s.asset, s]));
        this.watchlist.data = this.watchlist.data.map((item) => ({
          ...item,
          synthesis: synthMap.get(item.asset),
        }));
      },
    });
  }

  remove(asset: string): void {
    this.signalService.removeFromWatchlist(asset).subscribe({
      next: () => {
        this.watchlist.data = this.watchlist.data.filter(
          (item) => item.asset !== asset,
        );
      },
    });
  }

  directionColor(direction: string): string {
    switch (direction) {
      case 'BUY':
        return '#4caf50';
      case 'SELL':
        return '#f44336';
      default:
        return '#ff9800';
    }
  }
}
