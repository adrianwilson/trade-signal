import { Component, OnInit, inject, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { SignalService } from '../../services/signal.service';
import type { AggregatedSignal } from '@org/signals';

@Component({
  selector: 'app-synthesis-view',
  standalone: true,
  imports: [
    MatCardModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './synthesis-view.html',
  styleUrl: './synthesis-view.scss',
})
export class SynthesisViewComponent implements OnInit {
  private readonly signalService = inject(SignalService);

  syntheses = signal<AggregatedSignal[]>([]);
  loading = signal(true);
  refreshing = signal(false);
  error = signal('');

  ngOnInit(): void {
    this.loadData();
  }

  refresh(): void {
    this.refreshing.set(true);
    this.loadData();
  }

  private loadData(): void {
    this.signalService.getSynthesis().subscribe({
      next: (data) => {
        this.syntheses.set(data);
        this.loading.set(false);
        this.refreshing.set(false);
      },
      error: () => {
        this.error.set('Failed to load synthesis data. Is the API running?');
        this.loading.set(false);
        this.refreshing.set(false);
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
