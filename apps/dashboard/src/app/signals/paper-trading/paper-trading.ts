import { Component, OnInit, inject, signal } from '@angular/core';
import {
  DecimalPipe,
  CurrencyPipe,
  PercentPipe,
  DatePipe,
  UpperCasePipe,
} from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import {
  SignalService,
  PaperAccount,
  PaperTrade,
  PaperPerformance,
} from '../../services/signal.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-paper-trading',
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
    PercentPipe,
    DatePipe,
    UpperCasePipe,
  ],
  templateUrl: './paper-trading.html',
  styleUrl: './paper-trading.scss',
})
export class PaperTradingComponent implements OnInit {
  private readonly signalService = inject(SignalService);
  readonly authService = inject(AuthService);

  account = signal<PaperAccount | null>(null);
  performance = signal<PaperPerformance | null>(null);
  trades = signal<PaperTrade[]>([]);
  loading = signal(true);
  error = signal('');

  positionColumns = [
    'asset',
    'quantity',
    'avgPrice',
    'currentPrice',
    'pnl',
    'actions',
  ];
  tradeColumns = [
    'asset',
    'side',
    'quantity',
    'entryPrice',
    'exitPrice',
    'pnl',
    'source',
    'date',
  ];

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      this.error.set('Please login to use paper trading.');
      this.loading.set(false);
      return;
    }
    this.loadAccounts();
  }

  private loadAccounts(): void {
    this.signalService.getPaperAccounts().subscribe({
      next: (accounts) => {
        if (accounts.length === 0) {
          this.loading.set(false);
          return;
        }
        this.loadAccountData(accounts[0].id);
      },
      error: () => {
        this.error.set('Failed to load paper trading data.');
        this.loading.set(false);
      },
    });
  }

  private loadAccountData(accountId: string): void {
    this.signalService.getPaperAccountSummary(accountId).subscribe({
      next: (account) => {
        this.account.set(account);
        this.loading.set(false);
      },
    });
    this.signalService.getPaperPerformance(accountId).subscribe({
      next: (perf) => this.performance.set(perf),
    });
    this.signalService.getPaperTrades(accountId).subscribe({
      next: (trades) => this.trades.set(trades),
    });
  }

  createAccount(): void {
    this.signalService.createPaperAccount().subscribe({
      next: (account) => {
        this.loadAccountData(account.id);
      },
    });
  }

  closePosition(asset: string): void {
    const acc = this.account();
    if (!acc) return;
    this.signalService.closePaperPosition(acc.id, asset).subscribe({
      next: () => this.loadAccountData(acc.id),
    });
  }

  pnlColor(pnl: number | null): string {
    if (!pnl) return '#9e9e9e';
    return pnl > 0 ? '#4caf50' : '#f44336';
  }
}
