import type { AssetClass } from '@org/signals';

export interface ScanAsset {
  asset: string;
  assetClass: AssetClass;
  yahooSymbol: string;
}

export const SCAN_UNIVERSE: ScanAsset[] = [
  // Top 30 stocks
  { asset: 'AAPL', assetClass: 'equity', yahooSymbol: 'AAPL' },
  { asset: 'MSFT', assetClass: 'equity', yahooSymbol: 'MSFT' },
  { asset: 'GOOGL', assetClass: 'equity', yahooSymbol: 'GOOGL' },
  { asset: 'AMZN', assetClass: 'equity', yahooSymbol: 'AMZN' },
  { asset: 'NVDA', assetClass: 'equity', yahooSymbol: 'NVDA' },
  { asset: 'META', assetClass: 'equity', yahooSymbol: 'META' },
  { asset: 'TSLA', assetClass: 'equity', yahooSymbol: 'TSLA' },
  { asset: 'JPM', assetClass: 'equity', yahooSymbol: 'JPM' },
  { asset: 'V', assetClass: 'equity', yahooSymbol: 'V' },
  { asset: 'JNJ', assetClass: 'equity', yahooSymbol: 'JNJ' },
  { asset: 'WMT', assetClass: 'equity', yahooSymbol: 'WMT' },
  { asset: 'PG', assetClass: 'equity', yahooSymbol: 'PG' },
  { asset: 'UNH', assetClass: 'equity', yahooSymbol: 'UNH' },
  { asset: 'HD', assetClass: 'equity', yahooSymbol: 'HD' },
  { asset: 'MA', assetClass: 'equity', yahooSymbol: 'MA' },
  { asset: 'DIS', assetClass: 'equity', yahooSymbol: 'DIS' },
  { asset: 'NFLX', assetClass: 'equity', yahooSymbol: 'NFLX' },
  { asset: 'PYPL', assetClass: 'equity', yahooSymbol: 'PYPL' },
  { asset: 'INTC', assetClass: 'equity', yahooSymbol: 'INTC' },
  { asset: 'AMD', assetClass: 'equity', yahooSymbol: 'AMD' },
  { asset: 'CRM', assetClass: 'equity', yahooSymbol: 'CRM' },
  { asset: 'ADBE', assetClass: 'equity', yahooSymbol: 'ADBE' },
  { asset: 'ORCL', assetClass: 'equity', yahooSymbol: 'ORCL' },
  { asset: 'CSCO', assetClass: 'equity', yahooSymbol: 'CSCO' },
  { asset: 'PEP', assetClass: 'equity', yahooSymbol: 'PEP' },
  { asset: 'KO', assetClass: 'equity', yahooSymbol: 'KO' },
  { asset: 'MRK', assetClass: 'equity', yahooSymbol: 'MRK' },
  { asset: 'ABT', assetClass: 'equity', yahooSymbol: 'ABT' },
  { asset: 'TMO', assetClass: 'equity', yahooSymbol: 'TMO' },
  { asset: 'COST', assetClass: 'equity', yahooSymbol: 'COST' },
  // Top 10 crypto (from CoinGecko map)
  { asset: 'BTC/USD', assetClass: 'crypto', yahooSymbol: 'BTC-USD' },
  { asset: 'ETH/USD', assetClass: 'crypto', yahooSymbol: 'ETH-USD' },
  { asset: 'SOL/USD', assetClass: 'crypto', yahooSymbol: 'SOL-USD' },
  { asset: 'ADA/USD', assetClass: 'crypto', yahooSymbol: 'ADA-USD' },
  { asset: 'DOT/USD', assetClass: 'crypto', yahooSymbol: 'DOT-USD' },
  { asset: 'AVAX/USD', assetClass: 'crypto', yahooSymbol: 'AVAX-USD' },
  { asset: 'LINK/USD', assetClass: 'crypto', yahooSymbol: 'LINK-USD' },
  { asset: 'MATIC/USD', assetClass: 'crypto', yahooSymbol: 'MATIC-USD' },
  { asset: 'XRP/USD', assetClass: 'crypto', yahooSymbol: 'XRP-USD' },
  { asset: 'DOGE/USD', assetClass: 'crypto', yahooSymbol: 'DOGE-USD' },
];
