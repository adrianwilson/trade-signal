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

export interface CalibrationBucket {
  bucket: string;
  range: [number, number];
  expectedAccuracy: number;
  actualAccuracy: number;
  total: number;
  correct: number;
}

export interface RetrospectiveSummary {
  totalSignals: number;
  evaluatedSignals: number;
  correctSignals: number;
  overallAccuracy: number;
  hypotheticalTrades: number;
  hypotheticalPnlPercent: number;
  byDirection: {
    BUY: { count: number; correct: number; avgReturn: number };
    SELL: { count: number; correct: number; avgReturn: number };
  };
}

export interface LeaderboardEntry {
  rank: number;
  source: string;
  total: number;
  correct: number;
  incorrect: number;
  pending: number;
  accuracyRate: number;
  recentAccuracyRate: number | null;
  trend: 'hot' | 'cold' | 'stable' | null;
}

export interface AlertItem {
  id: string;
  asset: string;
  direction: string;
  confidence: number;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface PortfolioPosition {
  id: string;
  asset: string;
  assetClass: string;
  quantity: number;
  avgPrice: number;
  addedAt: string;
}

export interface PaperAccount {
  id: string;
  name: string;
  cashBalance: number;
  startingBalance: number;
  totalValue: number;
  totalReturn: number;
  openPositions: {
    asset: string;
    quantity: number;
    avgPrice: number;
    currentPrice: number | null;
    unrealizedPnl: number | null;
  }[];
  createdAt: string;
}

export interface PaperTrade {
  id: string;
  asset: string;
  side: string;
  quantity: number;
  entryPrice: number;
  exitPrice: number | null;
  status: string;
  signalSource: string | null;
  confidence: number;
  reasoning: string | null;
  enteredAt: string;
  pnl: number | null;
  pnlPercent: number | null;
}

export interface PaperPerformance {
  totalValue: number;
  totalReturn: number;
  totalReturnDollar: number;
  winRate: number;
  totalTrades: number;
  closedTrades: number;
  openPositionCount: number;
  bySource: Record<
    string,
    { trades: number; winRate: number; avgReturn: number }
  >;
}

export interface Opportunity {
  asset: string;
  assetClass: string;
  direction: string;
  confidence: number;
  rsi: number | null;
  macdSignal: string;
  smaSignal: string;
  bollingerSignal: string;
  price: number | null;
  changePercent: number | null;
  scannedAt: string;
}

export interface WatchlistItem {
  id: string;
  asset: string;
  assetClass: string;
  addedAt: string;
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

  getPortfolio(): Observable<PortfolioPosition[]> {
    return this.http.get<PortfolioPosition[]>(`${this.baseUrl}/portfolio`);
  }

  addPortfolioPosition(
    asset: string,
    assetClass: string,
    quantity: number,
    avgPrice: number,
  ): Observable<PortfolioPosition> {
    return this.http.post<PortfolioPosition>(`${this.baseUrl}/portfolio`, {
      asset,
      assetClass,
      quantity,
      avgPrice,
    });
  }

  removePortfolioPosition(asset: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/portfolio/${asset}`);
  }

  getNewsSentiment(): Observable<AssetSentiment[]> {
    return this.http.get<AssetSentiment[]>(`${this.baseUrl}/news-sentiment`);
  }

  analyzeNewsSentiment(symbol: string): Observable<AssetSentiment> {
    return this.http.get<AssetSentiment>(
      `${this.baseUrl}/news-sentiment/${symbol}`,
    );
  }

  getCalibration(): Observable<CalibrationBucket[]> {
    return this.http.get<CalibrationBucket[]>(
      `${this.baseUrl}/outcomes/calibration`,
    );
  }

  getRetrospective(): Observable<RetrospectiveSummary> {
    return this.http.get<RetrospectiveSummary>(
      `${this.baseUrl}/outcomes/retrospective`,
    );
  }

  getLeaderboard(windowDays?: number): Observable<LeaderboardEntry[]> {
    const params = windowDays ? `?window=${windowDays}` : '';
    return this.http.get<LeaderboardEntry[]>(
      `${this.baseUrl}/outcomes/leaderboard${params}`,
    );
  }

  getSynthesis(timeframe?: string): Observable<AggregatedSignal[]> {
    const params =
      timeframe && timeframe !== 'all' ? `?timeframe=${timeframe}` : '';
    return this.http.get<AggregatedSignal[]>(
      `${this.baseUrl}/synthesis${params}`,
    );
  }

  getWatchlist(): Observable<WatchlistItem[]> {
    return this.http.get<WatchlistItem[]>(`${this.baseUrl}/watchlist`);
  }

  addToWatchlist(asset: string, assetClass: string): Observable<WatchlistItem> {
    return this.http.post<WatchlistItem>(`${this.baseUrl}/watchlist`, {
      asset,
      assetClass,
    });
  }

  removeFromWatchlist(asset: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/watchlist/${asset}`);
  }

  getAlerts(): Observable<AlertItem[]> {
    return this.http.get<AlertItem[]>(`${this.baseUrl}/alerts`);
  }

  getUnreadAlertCount(): Observable<number> {
    return this.http.get<number>(`${this.baseUrl}/alerts/unread-count`);
  }

  markAlertAsRead(id: string): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/alerts/${id}/read`, {});
  }

  markAllAlertsAsRead(): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/alerts/read-all`, {});
  }

  generateAlerts(): Observable<AlertItem[]> {
    return this.http.get<AlertItem[]>(`${this.baseUrl}/alerts/generate`);
  }

  createPaperAccount(): Observable<PaperAccount> {
    return this.http.post<PaperAccount>(`${this.baseUrl}/paper/accounts`, {});
  }

  getPaperAccounts(): Observable<PaperAccount[]> {
    return this.http.get<PaperAccount[]>(`${this.baseUrl}/paper/accounts`);
  }

  getPaperAccountSummary(accountId: string): Observable<PaperAccount> {
    return this.http.get<PaperAccount>(
      `${this.baseUrl}/paper/accounts/${accountId}`,
    );
  }

  followSignal(accountId: string, signalId: string): Observable<PaperTrade> {
    return this.http.post<PaperTrade>(
      `${this.baseUrl}/paper/accounts/${accountId}/follow-signal`,
      { signalId },
    );
  }

  resetPaperAccount(accountId: string): Observable<PaperAccount> {
    return this.http.post<PaperAccount>(
      `${this.baseUrl}/paper/accounts/${accountId}/reset`,
      {},
    );
  }

  closePaperPosition(
    accountId: string,
    asset: string,
  ): Observable<PaperTrade[]> {
    return this.http.post<PaperTrade[]>(
      `${this.baseUrl}/paper/accounts/${accountId}/close/${asset}`,
      {},
    );
  }

  getPaperTrades(accountId: string): Observable<PaperTrade[]> {
    return this.http.get<PaperTrade[]>(
      `${this.baseUrl}/paper/accounts/${accountId}/trades`,
    );
  }

  getPaperPerformance(accountId: string): Observable<PaperPerformance> {
    return this.http.get<PaperPerformance>(
      `${this.baseUrl}/paper/accounts/${accountId}/performance`,
    );
  }

  getOpportunities(): Observable<Opportunity[]> {
    return this.http.get<Opportunity[]>(
      `${this.baseUrl}/scanner/opportunities`,
    );
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
