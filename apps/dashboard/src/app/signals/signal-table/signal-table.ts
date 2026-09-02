import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe, CurrencyPipe } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Signal as TradeSignal } from '@org/signals';
import { SignalService } from '../../services/signal.service';
import {
  AssetDetailComponent,
  AssetDetailData,
} from '../asset-detail/asset-detail';

@Component({
  selector: 'app-signal-table',
  standalone: true,
  imports: [
    MatTableModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    DatePipe,
    DecimalPipe,
    CurrencyPipe,
  ],
  templateUrl: './signal-table.html',
  styleUrl: './signal-table.scss',
})
export class SignalTableComponent implements OnInit {
  private readonly signalService = inject(SignalService);
  private readonly dialog = inject(MatDialog);

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
  signals: MatTableDataSource<TradeSignal> =
    new MatTableDataSource<TradeSignal>([]);
  quotes = signal<
    Record<string, { price: number; changePercent: number; updatedAt?: string }>
  >({});
  loading = signal(true);
  refreshing = signal(false);
  error = signal('');
  lastUpdated = signal('');

  ngOnInit(): void {
    this.loadData();
  }

  refresh(): void {
    this.refreshing.set(true);
    this.loadData();
  }

  private loadData(): void {
    this.signalService.getSignals().subscribe({
      next: (data) => {
        this.signals.data = data;
        this.loading.set(false);
        this.loadQuotes();
      },
      error: () => {
        this.error.set('Failed to load signals. Is the API running?');
        this.loading.set(false);
        this.refreshing.set(false);
      },
    });
  }

  private loadQuotes(): void {
    this.signalService.getMarketQuotes().subscribe({
      next: (data) => {
        this.quotes.set(data);
        this.refreshing.set(false);
        const timestamps = Object.values(data)
          .map((q) => q.updatedAt)
          .filter(Boolean) as string[];
        if (timestamps.length > 0) {
          this.lastUpdated.set(timestamps.sort().reverse()[0]);
        }
      },
      error: () => {
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
      case 'HOLD':
        return '#ff9800';
      default:
        return '#9e9e9e';
    }
  }

  openDetail(row: TradeSignal): void {
    const q = this.quotes();
    const quote = q[row.asset];
    const data: AssetDetailData = {
      asset: row.asset,
      assetClass: row.assetClass,
      price: quote?.price,
      changePercent: quote?.changePercent,
    };
    this.dialog.open(AssetDetailComponent, {
      data,
      width: '560px',
      maxHeight: '90vh',
    });
  }

  changeColor(change: number): string {
    if (change > 0) return '#4caf50';
    if (change < 0) return '#f44336';
    return '#9e9e9e';
  }
}
