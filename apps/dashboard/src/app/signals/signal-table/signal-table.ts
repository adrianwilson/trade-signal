import { Component, OnInit, inject } from '@angular/core';
import { DatePipe, DecimalPipe, CurrencyPipe } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Signal } from '@org/signals';
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
  signals: MatTableDataSource<Signal> = new MatTableDataSource<Signal>([]);
  quotes: Record<
    string,
    { price: number; changePercent: number; updatedAt?: string }
  > = {};
  loading = true;
  refreshing = false;
  error = '';
  lastUpdated = '';

  ngOnInit(): void {
    this.loadData();
  }

  refresh(): void {
    this.refreshing = true;
    this.loadData();
  }

  private loadData(): void {
    this.signalService.getSignals().subscribe({
      next: (data) => {
        this.signals.data = data;
        this.loading = false;
        this.loadQuotes();
      },
      error: () => {
        this.error = 'Failed to load signals. Is the API running?';
        this.loading = false;
        this.refreshing = false;
      },
    });
  }

  private loadQuotes(): void {
    this.signalService.getMarketQuotes().subscribe({
      next: (data) => {
        this.quotes = data;
        this.refreshing = false;
        const timestamps = Object.values(data)
          .map((q) => q.updatedAt)
          .filter(Boolean) as string[];
        if (timestamps.length > 0) {
          this.lastUpdated = timestamps.sort().reverse()[0];
        }
      },
      error: () => {
        this.refreshing = false;
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

  openDetail(signal: Signal): void {
    const quote = this.quotes[signal.asset];
    const data: AssetDetailData = {
      asset: signal.asset,
      assetClass: signal.assetClass,
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
