import { Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe, CurrencyPipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { SignalService, Opportunity } from '../../services/signal.service';

@Component({
  selector: 'app-opportunities',
  standalone: true,
  imports: [
    MatTableModule,
    MatCardModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatIconModule,
    DecimalPipe,
    CurrencyPipe,
  ],
  templateUrl: './opportunities.html',
  styleUrl: './opportunities.scss',
})
export class OpportunitiesComponent implements OnInit {
  private readonly signalService = inject(SignalService);

  opportunities = signal<Opportunity[]>([]);
  loading = signal(true);
  error = signal('');

  displayedColumns = [
    'rank',
    'asset',
    'direction',
    'confidence',
    'rsi',
    'macd',
    'price',
    'change',
  ];

  ngOnInit(): void {
    this.loadData();
  }

  refresh(): void {
    this.loading.set(true);
    this.loadData();
  }

  private loadData(): void {
    this.signalService.getOpportunities().subscribe({
      next: (data) => {
        this.opportunities.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load opportunities. Is the API running?');
        this.loading.set(false);
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

  changeColor(change: number | null): string {
    if (change === null) return '#9e9e9e';
    return change >= 0 ? '#4caf50' : '#f44336';
  }
}
