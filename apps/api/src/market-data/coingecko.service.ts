import { Injectable, Logger } from '@nestjs/common';
import type { HistoryResult, QuoteResult } from './market-data.service';

const COIN_MAP: Record<string, string> = {
  'BTC/USD': 'bitcoin',
  'ETH/USD': 'ethereum',
  'SOL/USD': 'solana',
  'ADA/USD': 'cardano',
  'DOT/USD': 'polkadot',
  'AVAX/USD': 'avalanche-2',
  'LINK/USD': 'chainlink',
  'MATIC/USD': 'matic-network',
  'XRP/USD': 'ripple',
  'DOGE/USD': 'dogecoin',
};

@Injectable()
export class CoinGeckoService {
  private readonly logger = new Logger(CoinGeckoService.name);
  private readonly baseUrl = 'https://api.coingecko.com/api/v3';

  isCryptoAsset(asset: string): boolean {
    return COIN_MAP[asset] !== undefined;
  }

  getCoinId(asset: string): string | null {
    return COIN_MAP[asset] ?? null;
  }

  async getQuote(asset: string): Promise<QuoteResult | null> {
    const coinId = this.getCoinId(asset);
    if (!coinId) return null;

    try {
      const url = `${this.baseUrl}/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true`;
      const res = await fetch(url);
      if (!res.ok) return null;

      const data = (await res.json()) as Record<
        string,
        { usd: number; usd_24h_change?: number; usd_24h_vol?: number }
      >;
      const coin = data[coinId];
      if (!coin) return null;

      return {
        symbol: asset,
        price: coin.usd,
        changePercent: coin.usd_24h_change ?? 0,
        volume: coin.usd_24h_vol ?? null,
        updatedAt: new Date().toISOString(),
      };
    } catch (err) {
      this.logger.warn(`CoinGecko quote failed for ${asset}: ${err}`);
      return null;
    }
  }

  async getHistory(asset: string, days: number): Promise<HistoryResult[]> {
    const coinId = this.getCoinId(asset);
    if (!coinId) return [];

    try {
      const url = `${this.baseUrl}/coins/${coinId}/market_chart?vs_currency=usd&days=${days}&interval=daily`;
      const res = await fetch(url);
      if (!res.ok) return [];

      const data = (await res.json()) as {
        prices: [number, number][];
      };

      return data.prices.map(([timestamp, price]) => ({
        date: new Date(timestamp).toISOString().split('T')[0],
        open: price,
        high: price,
        low: price,
        close: price,
        volume: 0,
      }));
    } catch (err) {
      this.logger.warn(`CoinGecko history failed for ${asset}: ${err}`);
      return [];
    }
  }
}
