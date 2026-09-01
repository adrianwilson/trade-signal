import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Signal, ManualSignalInput } from '@org/signals';

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
