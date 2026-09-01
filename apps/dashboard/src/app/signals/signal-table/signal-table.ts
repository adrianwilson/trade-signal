import { Component, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
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
    'confidence',
    'source',
    'timestamp',
  ];
  signals: MatTableDataSource<Signal> = new MatTableDataSource<Signal>([]);
  loading = true;
  error = '';

  ngOnInit(): void {
    this.signalService.getSignals().subscribe({
      next: (data) => {
        this.signals.data = data;
        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to load signals. Is the API running?';
        this.loading = false;
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
}
