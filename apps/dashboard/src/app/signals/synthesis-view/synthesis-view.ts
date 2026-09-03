import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
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
    MatSelectModule,
    MatFormFieldModule,
  ],
  templateUrl: './synthesis-view.html',
  styleUrl: './synthesis-view.scss',
})
export class SynthesisViewComponent implements OnInit {
  private readonly signalService = inject(SignalService);

  allSyntheses = signal<AggregatedSignal[]>([]);
  selectedClass = signal('all');
  loading = signal(true);
  refreshing = signal(false);
  error = signal('');

  syntheses = computed(() => {
    const filter = this.selectedClass();
    const all = this.allSyntheses();
    if (filter === 'all') return all;
    return all.filter((s) => s.assetClass === filter);
  });

  assetClasses = computed(() => {
    const classes = new Set(this.allSyntheses().map((s) => s.assetClass));
    return ['all', ...Array.from(classes)];
  });

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
        this.allSyntheses.set(data);
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
