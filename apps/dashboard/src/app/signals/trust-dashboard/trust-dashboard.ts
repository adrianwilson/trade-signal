import { Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe, PercentPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import {
  SignalService,
  CalibrationBucket,
  RetrospectiveSummary,
} from '../../services/signal.service';

@Component({
  selector: 'app-trust-dashboard',
  standalone: true,
  imports: [
    MatCardModule,
    MatProgressSpinnerModule,
    MatIconModule,
    DecimalPipe,
    PercentPipe,
  ],
  templateUrl: './trust-dashboard.html',
  styleUrl: './trust-dashboard.scss',
})
export class TrustDashboardComponent implements OnInit {
  private readonly signalService = inject(SignalService);

  calibration = signal<CalibrationBucket[]>([]);
  retrospective = signal<RetrospectiveSummary | null>(null);
  loading = signal(true);
  error = signal('');

  ngOnInit(): void {
    let loaded = 0;
    const done = () => {
      loaded++;
      if (loaded >= 2) this.loading.set(false);
    };

    this.signalService.getCalibration().subscribe({
      next: (data) => {
        this.calibration.set(data);
        done();
      },
      error: () => {
        this.error.set('Failed to load trust data.');
        this.loading.set(false);
      },
    });

    this.signalService.getRetrospective().subscribe({
      next: (data) => {
        this.retrospective.set(data);
        done();
      },
      error: () => {
        this.error.set('Failed to load trust data.');
        this.loading.set(false);
      },
    });
  }

  calibrationBarWidth(rate: number): string {
    return `${Math.round(rate * 100)}%`;
  }

  pnlColor(pnl: number): string {
    return pnl >= 0 ? '#4caf50' : '#f44336';
  }
}
