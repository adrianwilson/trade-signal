import {
  Component,
  OnInit,
  Inject,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { SignalService } from '../../services/signal.service';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

export interface AssetDetailData {
  asset: string;
  assetClass: string;
  price?: number;
  changePercent?: number;
}

interface AnalysisResult {
  symbol: string;
  rsi: number | null;
  rsiSignal: string;
  macd: { line: number; signal: number; histogram: number } | null;
  macdSignal: string;
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  ema20: number | null;
  bollingerPercentB: number | null;
  bollingerSignal: string;
  crossover: { type: string; occurred: boolean };
  smaSignal: string;
  overallSignal: string;
}

@Component({
  selector: 'app-asset-detail',
  standalone: true,
  imports: [
    MatDialogModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatIconModule,
    MatButtonModule,
    DecimalPipe,
  ],
  templateUrl: './asset-detail.html',
  styleUrl: './asset-detail.scss',
})
export class AssetDetailComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('gaugeCanvas') gaugeCanvas!: ElementRef<HTMLCanvasElement>;

  loading = true;
  error = '';
  analysis: AnalysisResult | null = null;
  private chart: Chart | null = null;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: AssetDetailData,
    private dialogRef: MatDialogRef<AssetDetailComponent>,
    private signalService: SignalService,
  ) {}

  ngOnInit(): void {
    this.signalService.getAnalysis(this.data.asset).subscribe({
      next: (result) => {
        this.analysis = result as unknown as AnalysisResult;
        this.loading = false;
        setTimeout(() => this.renderGauge(), 0);
      },
      error: () => {
        this.error = 'Failed to load analysis data.';
        this.loading = false;
      },
    });
  }

  ngAfterViewInit(): void {
    // Chart rendered after data loads via setTimeout
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  close(): void {
    this.dialogRef.close();
  }

  signalColor(signal: string): string {
    switch (signal) {
      case 'BUY':
        return '#4caf50';
      case 'SELL':
        return '#f44336';
      default:
        return '#ff9800';
    }
  }

  rsiZone(rsi: number | null): string {
    if (rsi === null) return 'N/A';
    if (rsi < 30) return 'Oversold';
    if (rsi > 70) return 'Overbought';
    return 'Neutral';
  }

  bollingerZone(percentB: number | null): string {
    if (percentB === null) return 'N/A';
    if (percentB < 0.2) return 'Near lower band';
    if (percentB > 0.8) return 'Near upper band';
    return 'Within bands';
  }

  private renderGauge(): void {
    if (!this.analysis || !this.gaugeCanvas) return;

    const indicators = [
      { label: 'RSI', signal: this.analysis.rsiSignal },
      { label: 'MACD', signal: this.analysis.macdSignal },
      { label: 'SMA', signal: this.analysis.smaSignal },
      { label: 'Bollinger', signal: this.analysis.bollingerSignal },
    ];

    const labels = indicators.map((i) => i.label);
    const values = indicators.map((i) =>
      i.signal === 'BUY' ? 1 : i.signal === 'SELL' ? -1 : 0,
    );
    const colors = indicators.map((i) => this.signalColor(i.signal));

    this.chart = new Chart(this.gaugeCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: colors,
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const v = ctx.raw as number;
                return v === 1 ? 'BUY' : v === -1 ? 'SELL' : 'HOLD';
              },
            },
          },
        },
        scales: {
          y: {
            min: -1.5,
            max: 1.5,
            ticks: {
              callback: (v) => {
                if (v === 1) return 'BUY';
                if (v === -1) return 'SELL';
                if (v === 0) return 'HOLD';
                return '';
              },
            },
          },
        },
      },
    });
  }
}
