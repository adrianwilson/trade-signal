import { CoinGeckoService } from './coingecko.service';

describe('CoinGeckoService', () => {
  let service: CoinGeckoService;

  beforeEach(() => {
    service = new CoinGeckoService();
  });

  describe('isCryptoAsset', () => {
    it('should return true for known crypto assets', () => {
      expect(service.isCryptoAsset('BTC/USD')).toBe(true);
      expect(service.isCryptoAsset('ETH/USD')).toBe(true);
    });

    it('should return false for unknown assets', () => {
      expect(service.isCryptoAsset('AAPL')).toBe(false);
    });
  });

  describe('getCoinId', () => {
    it('should return coingecko id for known assets', () => {
      expect(service.getCoinId('BTC/USD')).toBe('bitcoin');
      expect(service.getCoinId('ETH/USD')).toBe('ethereum');
    });

    it('should return null for unknown assets', () => {
      expect(service.getCoinId('UNKNOWN')).toBeNull();
    });
  });

  describe('getQuote', () => {
    it('should return null for unknown asset', async () => {
      const result = await service.getQuote('UNKNOWN');
      expect(result).toBeNull();
    });
  });

  describe('getHistory', () => {
    it('should return empty for unknown asset', async () => {
      const result = await service.getHistory('UNKNOWN', 30);
      expect(result).toEqual([]);
    });
  });
});
