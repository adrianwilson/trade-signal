import { Component, OnInit, inject } from '@angular/core';
import { DatePipe, DecimalPipe, CurrencyPipe } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { Signal } from '@org/signals';
import { SignalService } from '../../services/signal.service';

@Component({
  selector: 'app-signal-table',
  standalone: true,
  imports: [
    MatTableModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatCardModule,
    DatePipe,
    DecimalPipe,
    CurrencyPipe,
  ],
  templateUrl: './signal-table.html',
  styleUrl: './signal-table.scss',
})
export class SignalTableComponent implements OnInit {
  private readonly signalService = inject(SignalService);

  displayedColumns = [
    'asset',
    'assetClass',
    'direction',
    'price',
    'priceChange',
    'confidence',
    'source',
    'timestamp',
  ];
  signals: MatTableDataSource<Signal> = new MatTableDataSource<Signal>([]);
  quotes: Record<string, { price: number; changePercent: number }> = {};
  loading = true;
  error = '';

  ngOnInit(): void {
    this.signalService.getSignals().subscribe({
      next: (data) => {
        this.signals.data = data;
        this.loading = false;
        this.loadQuotes();
      },
      error: () => {
        this.error = 'Failed to load signals. Is the API running?';
        this.loading = false;
      },
    });
  }

  private loadQuotes(): void {
    this.signalService.getMarketQuotes().subscribe({
      next: (data) => {
        this.quotes = data;
      },
      error: () => {
        // Quotes are optional — don't break the table if market data fails
      },
    });
  }

  directionColor(direction: string): string {
    switch (direction) {
      case 'BUY':
        return '#4caf50';
      case 'SELL':
        return '#f44336';
      case 'HOLD':
        return '#ff9800';
      default:
        return '#9e9e9e';
    }
  }

  changeColor(change: number): string {
    if (change > 0) return '#4caf50';
    if (change < 0) return '#f44336';
    return '#9e9e9e';
  }
}
