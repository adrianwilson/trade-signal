import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Signal, ManualSignalInput, AggregatedSignal } from '@org/signals';

export interface NewsHeadline {
  title: string;
  source: string;
  url: string;
  publishedAt: string;
}

export interface AssetSentiment {
  asset: string;
  score: number;
  signal: string;
  headlineCount: number;
  headlines: NewsHeadline[];
}

@Injectable({ providedIn: 'root' })
export class SignalService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:3000/api';

  getSignals(): Observable<Signal[]> {
    return this.http.get<Signal[]>(`${this.baseUrl}/signals`);
  }

  getSignal(id: string): Observable<Signal> {
    return this.http.get<Signal>(`${this.baseUrl}/signals/${id}`);
  }

  createSignal(input: ManualSignalInput): Observable<Signal> {
    return this.http.post<Signal>(`${this.baseUrl}/signals`, input);
  }

  getAnalysis(symbol: string): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(
      `${this.baseUrl}/technical-analysis/${symbol}`,
    );
  }

  getNewsSentiment(): Observable<AssetSentiment[]> {
    return this.http.get<AssetSentiment[]>(`${this.baseUrl}/news-sentiment`);
  }

  analyzeNewsSentiment(symbol: string): Observable<AssetSentiment> {
    return this.http.get<AssetSentiment>(
      `${this.baseUrl}/news-sentiment/${symbol}`,
    );
  }

  getSynthesis(): Observable<AggregatedSignal[]> {
    return this.http.get<AggregatedSignal[]>(`${this.baseUrl}/synthesis`);
  }

  getMarketQuotes(): Observable<
    Record<string, { price: number; changePercent: number; updatedAt?: string }>
  > {
    return this.http.get<
      Record<
        string,
        { price: number; changePercent: number; updatedAt?: string }
      >
    >(`${this.baseUrl}/market-data/quotes`);
  }
}
