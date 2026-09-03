import { Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe, CurrencyPipe, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import {
  SignalService,
  PortfolioPosition,
} from '../../services/signal.service';
import { AuthService } from '../../services/auth.service';
import type { AggregatedSignal } from '@org/signals';

type PositionRow = PortfolioPosition & {
  synthesis?: AggregatedSignal;
  currentPrice?: number;
  marketValue?: number;
  pnl?: number;
  pnlPercent?: number;
};

@Component({
  selector: 'app-portfolio',
  standalone: true,
  imports: [
    RouterModule,
    MatTableModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    DecimalPipe,
    CurrencyPipe,
    DatePipe,
  ],
  templateUrl: './portfolio.html',
  styleUrl: './portfolio.scss',
})
export class PortfolioComponent implements OnInit {
  private readonly signalService = inject(SignalService);
  readonly authService = inject(AuthService);

  displayedColumns = [
    'asset',
    'quantity',
    'avgPrice',
    'currentPrice',
    'marketValue',
    'pnl',
    'signal',
    'actions',
  ];
  portfolio: MatTableDataSource<PositionRow> =
    new MatTableDataSource<PositionRow>([]);
  loading = signal(true);
  error = signal('');
  showAddForm = signal(false);
  newAsset = signal('');
  newQuantity = signal(0);
  newAvgPrice = signal(0);

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      this.error.set('Please login to view your portfolio.');
      this.loading.set(false);
      return;
    }
    this.loadData();
  }

  private loadData(): void {
    this.signalService.getPortfolio().subscribe({
      next: (positions) => {
        this.portfolio.data = positions;
        this.loading.set(false);
        this.enrichWithMarketData();
      },
      error: () => {
        this.error.set('Failed to load portfolio.');
        this.loading.set(false);
      },
    });
  }

  private enrichWithMarketData(): void {
    this.signalService.getMarketQuotes().subscribe({
      next: (quotes) => {
        this.signalService.getSynthesis().subscribe({
          next: (syntheses) => {
            const synthMap = new Map(syntheses.map((s) => [s.asset, s]));
            this.portfolio.data = this.portfolio.data.map((pos) => {
              const quote = quotes[pos.asset];
              const currentPrice = quote?.price;
              const marketValue = currentPrice
                ? currentPrice * pos.quantity
                : undefined;
              const costBasis = pos.avgPrice * pos.quantity;
              const pnl = marketValue ? marketValue - costBasis : undefined;
              const pnlPercent = pnl ? (pnl / costBasis) * 100 : undefined;
              return {
                ...pos,
                synthesis: synthMap.get(pos.asset),
                currentPrice,
                marketValue,
                pnl,
                pnlPercent,
              };
            });
          },
        });
      },
    });
  }

  addPosition(): void {
    if (!this.newAsset() || !this.newQuantity() || !this.newAvgPrice()) return;
    this.signalService
      .addPortfolioPosition(
        this.newAsset().toUpperCase(),
        'equity',
        this.newQuantity(),
        this.newAvgPrice(),
      )
      .subscribe({
        next: () => {
          this.newAsset.set('');
          this.newQuantity.set(0);
          this.newAvgPrice.set(0);
          this.showAddForm.set(false);
          this.loadData();
        },
      });
  }

  removePosition(asset: string): void {
    this.signalService.removePortfolioPosition(asset).subscribe({
      next: () => {
        this.portfolio.data = this.portfolio.data.filter(
          (p) => p.asset !== asset,
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

  pnlColor(pnl: number | undefined): string {
    if (!pnl) return '#9e9e9e';
    return pnl > 0 ? '#4caf50' : '#f44336';
  }
}
