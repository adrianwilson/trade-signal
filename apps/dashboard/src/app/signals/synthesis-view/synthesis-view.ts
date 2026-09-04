import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { SignalService } from '../../services/signal.service';
import { AuthService } from '../../services/auth.service';
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
    MatButtonToggleModule,
  ],
  templateUrl: './synthesis-view.html',
  styleUrl: './synthesis-view.scss',
})
export class SynthesisViewComponent implements OnInit {
  private readonly signalService = inject(SignalService);
  readonly authService = inject(AuthService);

  allSyntheses = signal<AggregatedSignal[]>([]);
  selectedClass = signal('all');
  selectedTimeframe = signal('all');
  readonly timeframes = ['all', 'intraday', 'swing', 'long-term'];
  readonly timeframeLabels: Record<string, string> = {
    all: 'All',
    intraday: 'Intraday (1H)',
    swing: 'Swing (1D)',
    'long-term': 'Long-term (1W)',
  };
  loading = signal(true);
  refreshing = signal(false);
  error = signal('');
  paperAccountId = signal<string | null>(null);
  followedAssets = signal<Set<string>>(new Set());
  followingInProgress = signal<Set<string>>(new Set());
  closingInProgress = signal<Set<string>>(new Set());

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
    if (this.authService.isAuthenticated()) {
      this.loadPaperAccount();
    }
  }

  refresh(): void {
    this.refreshing.set(true);
    this.loadData();
  }

  followSignal(synthesis: AggregatedSignal): void {
    const accountId = this.paperAccountId();
    if (!accountId || synthesis.signals.length === 0) return;

    const signalId = synthesis.signals[0].id;
    this.followingInProgress.update((s) => new Set(s).add(synthesis.asset));

    this.signalService.followSignal(accountId, signalId).subscribe({
      next: () => {
        this.followedAssets.update((s) => new Set(s).add(synthesis.asset));
        this.followingInProgress.update((s) => {
          const next = new Set(s);
          next.delete(synthesis.asset);
          return next;
        });
      },
      error: () => {
        this.followingInProgress.update((s) => {
          const next = new Set(s);
          next.delete(synthesis.asset);
          return next;
        });
      },
    });
  }

  closePosition(synthesis: AggregatedSignal): void {
    const accountId = this.paperAccountId();
    if (!accountId) return;

    this.closingInProgress.update((s) => new Set(s).add(synthesis.asset));

    this.signalService
      .closePaperPosition(accountId, synthesis.asset)
      .subscribe({
        next: () => {
          this.followedAssets.update((s) => {
            const next = new Set(s);
            next.delete(synthesis.asset);
            return next;
          });
          this.closingInProgress.update((s) => {
            const next = new Set(s);
            next.delete(synthesis.asset);
            return next;
          });
        },
        error: () => {
          this.closingInProgress.update((s) => {
            const next = new Set(s);
            next.delete(synthesis.asset);
            return next;
          });
        },
      });
  }

  onTimeframeChange(timeframe: string): void {
    this.selectedTimeframe.set(timeframe);
    this.loading.set(true);
    this.loadData();
  }

  alignmentColor(alignment?: string): string {
    switch (alignment) {
      case 'aligned':
        return '#4caf50';
      case 'divergent':
        return '#f44336';
      case 'mixed':
        return '#ff9800';
      default:
        return 'transparent';
    }
  }

  trackSynthesis(_index: number, s: AggregatedSignal): string {
    return s.asset + ':' + (s.timeframe ?? 'swing');
  }

  private loadData(): void {
    this.signalService.getSynthesis(this.selectedTimeframe()).subscribe({
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

  private loadPaperAccount(): void {
    this.signalService.getPaperAccounts().subscribe({
      next: (accounts) => {
        if (accounts.length > 0) {
          const accountId = accounts[0].id;
          this.paperAccountId.set(accountId);
          this.loadOpenPositions(accountId);
        } else {
          this.signalService.createPaperAccount().subscribe({
            next: (account) => this.paperAccountId.set(account.id),
          });
        }
      },
    });
  }

  private loadOpenPositions(accountId: string): void {
    this.signalService.getPaperAccountSummary(accountId).subscribe({
      next: (account) => {
        const openAssets = new Set(account.openPositions.map((p) => p.asset));
        this.followedAssets.set(openAssets);
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
