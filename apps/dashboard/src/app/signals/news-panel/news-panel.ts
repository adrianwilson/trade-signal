import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { SignalService, AssetSentiment } from '../../services/signal.service';

@Component({
  selector: 'app-news-panel',
  standalone: true,
  imports: [
    MatCardModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    DecimalPipe,
  ],
  templateUrl: './news-panel.html',
  styleUrl: './news-panel.scss',
})
export class NewsPanelComponent implements OnInit, OnDestroy {
  private readonly signalService = inject(SignalService);

  sentiments: AssetSentiment[] = [];
  loading = true;
  refreshing = false;
  error = '';
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private retryCount = 0;

  ngOnInit(): void {
    this.loadData();
  }

  refresh(): void {
    this.refreshing = true;
    this.loadData();
  }

  ngOnDestroy(): void {
    if (this.retryTimer) clearTimeout(this.retryTimer);
  }

  private loadData(): void {
    this.signalService.getNewsSentiment().subscribe({
      next: (data) => {
        if (data.length === 0 && this.retryCount < 3) {
          this.retryCount++;
          this.retryTimer = setTimeout(() => this.loadData(), 3000);
          return;
        }
        this.sentiments = data;
        this.loading = false;
        this.refreshing = false;
      },
      error: () => {
        this.error = 'Failed to load news sentiment. Is the API running?';
        this.loading = false;
        this.refreshing = false;
      },
    });
  }

  signalColor(signal: string): string {
    switch (signal) {
      case 'BUY':
        return '#4caf50';
      case 'SELL':
        return '#f44336';
      default:
        return '#ff9800';
    }
  }

  sentimentIcon(score: number): string {
    if (score > 0.1) return 'trending_up';
    if (score < -0.1) return 'trending_down';
    return 'trending_flat';
  }

  sentimentColor(score: number): string {
    if (score > 0.1) return '#4caf50';
    if (score < -0.1) return '#f44336';
    return '#ff9800';
  }
}
