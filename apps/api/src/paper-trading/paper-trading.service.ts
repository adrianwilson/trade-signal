import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { PaperAccountEntity, PaperTradeEntity } from './paper-trading.entities';
import { SignalsService } from '../signals/signals.service';
import { MarketDataService } from '../market-data/market-data.service';
import { randomUUID } from 'crypto';

const STARTING_BALANCE = 100_000;
const DEFAULT_SL_PCT = 0.05; // 5% stop-loss
const DEFAULT_TP_PCT = 0.1; // 10% take-profit

export interface PaperAccountSummary {
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
    stopLoss: number | null;
    takeProfit: number | null;
  }[];
  createdAt: string;
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

@Injectable()
export class PaperTradingService {
  private readonly logger = new Logger(PaperTradingService.name);

  constructor(
    @InjectRepository(PaperAccountEntity)
    private readonly accountRepo: Repository<PaperAccountEntity>,
    @InjectRepository(PaperTradeEntity)
    private readonly tradeRepo: Repository<PaperTradeEntity>,
    private readonly signalsService: SignalsService,
    private readonly marketDataService: MarketDataService,
  ) {}

  async createAccount(
    userId: string,
    name = 'Paper Account',
  ): Promise<PaperAccountEntity> {
    const account: PaperAccountEntity = {
      id: randomUUID(),
      userId,
      name,
      startingBalance: STARTING_BALANCE,
      cashBalance: STARTING_BALANCE,
      createdAt: new Date().toISOString(),
    };
    return this.accountRepo.save(account);
  }

  async getAccounts(userId: string): Promise<PaperAccountEntity[]> {
    return this.accountRepo.findBy({ userId });
  }

  async getAccountSummary(accountId: string): Promise<PaperAccountSummary> {
    const account = await this.accountRepo.findOneBy({ id: accountId });
    if (!account) throw new NotFoundException('Account not found');

    const openTrades = await this.tradeRepo.findBy({
      accountId,
      status: 'open',
    });

    // Group open trades by asset to get positions
    const positions = new Map<
      string,
      {
        quantity: number;
        totalCost: number;
        asset: string;
        stopLoss: number | null;
        takeProfit: number | null;
      }
    >();
    for (const trade of openTrades) {
      const pos = positions.get(trade.asset) ?? {
        quantity: 0,
        totalCost: 0,
        asset: trade.asset,
        stopLoss: null,
        takeProfit: null,
      };
      pos.quantity += trade.quantity;
      pos.totalCost += trade.quantity * trade.entryPrice;
      // Use the first trade's SL/TP (all trades for same asset share the same)
      if (!pos.stopLoss) pos.stopLoss = trade.stopLoss;
      if (!pos.takeProfit) pos.takeProfit = trade.takeProfit;
      positions.set(trade.asset, pos);
    }

    const openPositions = [];
    let positionsValue = 0;
    for (const [asset, pos] of positions) {
      const avgPrice = pos.totalCost / pos.quantity;
      let currentPrice: number | null = null;
      try {
        const quote = await this.marketDataService.getQuote(asset, asset);
        currentPrice = quote?.price ?? null;
      } catch {
        /* skip */
      }
      const unrealizedPnl = currentPrice
        ? (currentPrice - avgPrice) * pos.quantity
        : null;
      if (currentPrice) positionsValue += currentPrice * pos.quantity;
      openPositions.push({
        asset,
        quantity: pos.quantity,
        avgPrice,
        currentPrice,
        unrealizedPnl,
        stopLoss: pos.stopLoss,
        takeProfit: pos.takeProfit,
      });
    }

    const totalValue = account.cashBalance + positionsValue;
    const totalReturn =
      ((totalValue - account.startingBalance) / account.startingBalance) * 100;

    return {
      id: account.id,
      name: account.name,
      cashBalance: account.cashBalance,
      startingBalance: account.startingBalance,
      totalValue,
      totalReturn,
      openPositions,
      createdAt: account.createdAt,
    };
  }

  async followSignal(
    accountId: string,
    signalId: string,
  ): Promise<PaperTradeEntity> {
    const account = await this.accountRepo.findOneBy({ id: accountId });
    if (!account) throw new NotFoundException('Account not found');

    const signal = await this.signalsService.findOne(signalId);
    if (!signal) throw new NotFoundException('Signal not found');

    const symbol = this.marketDataService.mapSymbol(
      signal.asset,
      signal.assetClass,
    );
    const quote = await this.marketDataService.getQuote(symbol, signal.asset);
    if (!quote) throw new NotFoundException('Cannot get current price');

    // Position sizing based on confidence
    let sizePct: number;
    if (signal.confidence >= 80) sizePct = 0.1;
    else if (signal.confidence >= 60) sizePct = 0.05;
    else if (signal.confidence >= 40) sizePct = 0.02;
    else sizePct = 0.01;

    const positionSize = account.cashBalance * sizePct;
    const isCrypto = signal.assetClass === 'crypto';
    const rawQuantity = positionSize / quote.price;
    const quantity = isCrypto
      ? Math.round(rawQuantity * 1e6) / 1e6 // 6 decimal places for crypto
      : Math.floor(rawQuantity);
    if (quantity <= 0) throw new NotFoundException('Insufficient funds');

    const cost = quantity * quote.price;

    const isBuy = signal.direction === 'BUY';
    const stopLoss = isBuy
      ? Math.round(quote.price * (1 - DEFAULT_SL_PCT) * 100) / 100
      : Math.round(quote.price * (1 + DEFAULT_SL_PCT) * 100) / 100;
    const takeProfit = isBuy
      ? Math.round(quote.price * (1 + DEFAULT_TP_PCT) * 100) / 100
      : Math.round(quote.price * (1 - DEFAULT_TP_PCT) * 100) / 100;

    const trade: PaperTradeEntity = {
      id: randomUUID(),
      accountId,
      asset: signal.asset,
      assetClass: signal.assetClass,
      side: isBuy ? 'buy' : 'sell',
      quantity,
      entryPrice: quote.price,
      exitPrice: null,
      status: 'open',
      signalId: signal.id,
      signalSource: signal.source,
      confidence: signal.confidence,
      reasoning: signal.reasoning ?? null,
      enteredAt: new Date().toISOString(),
      exitedAt: null,
      pnl: null,
      pnlPercent: null,
      stopLoss,
      takeProfit,
      closeReason: null,
    };

    await this.tradeRepo.save(trade);

    account.cashBalance -= cost;
    await this.accountRepo.save(account);

    return trade;
  }

  async closePosition(
    accountId: string,
    asset: string,
    reason: 'manual' | 'stop-loss' | 'take-profit' = 'manual',
  ): Promise<PaperTradeEntity[]> {
    const account = await this.accountRepo.findOneBy({ id: accountId });
    if (!account) throw new NotFoundException('Account not found');

    const openTrades = await this.tradeRepo.findBy({
      accountId,
      asset,
      status: 'open',
    });
    if (openTrades.length === 0)
      throw new NotFoundException('No open position');

    const symbol = this.marketDataService.mapSymbol(
      asset,
      openTrades[0].assetClass,
    );
    const quote = await this.marketDataService.getQuote(symbol, asset);
    const exitPrice = quote?.price ?? openTrades[0].entryPrice;

    for (const trade of openTrades) {
      const pnl =
        trade.side === 'buy'
          ? (exitPrice - trade.entryPrice) * trade.quantity
          : (trade.entryPrice - exitPrice) * trade.quantity;
      trade.exitPrice = exitPrice;
      trade.status = 'closed';
      trade.exitedAt = new Date().toISOString();
      trade.pnl = pnl;
      trade.pnlPercent = (pnl / (trade.entryPrice * trade.quantity)) * 100;
      trade.closeReason = reason;
      await this.tradeRepo.save(trade);
      account.cashBalance += exitPrice * trade.quantity;
    }

    await this.accountRepo.save(account);
    return openTrades;
  }

  async resetAccount(accountId: string): Promise<PaperAccountEntity> {
    const account = await this.accountRepo.findOneBy({ id: accountId });
    if (!account) throw new NotFoundException('Account not found');

    await this.tradeRepo.delete({ accountId });
    account.cashBalance = STARTING_BALANCE;
    return this.accountRepo.save(account);
  }

  @Cron('0 */5 * * * *')
  async checkStopLossTakeProfit(): Promise<void> {
    const openTrades = await this.tradeRepo.findBy({ status: 'open' });
    if (openTrades.length === 0) return;

    const assetPrices = new Map<string, number>();
    const accountIds = new Set<string>();

    for (const trade of openTrades) {
      if (!trade.stopLoss && !trade.takeProfit) continue;

      let price = assetPrices.get(trade.asset);
      if (price === undefined) {
        try {
          const symbol = this.marketDataService.mapSymbol(
            trade.asset,
            trade.assetClass,
          );
          const quote = await this.marketDataService.getQuote(
            symbol,
            trade.asset,
          );
          price = quote?.price ?? undefined;
          if (price !== undefined) assetPrices.set(trade.asset, price);
        } catch {
          continue;
        }
      }
      if (price === undefined) continue;

      let reason: 'stop-loss' | 'take-profit' | null = null;

      if (trade.side === 'buy') {
        if (trade.stopLoss && price <= trade.stopLoss) reason = 'stop-loss';
        else if (trade.takeProfit && price >= trade.takeProfit)
          reason = 'take-profit';
      } else {
        if (trade.stopLoss && price >= trade.stopLoss) reason = 'stop-loss';
        else if (trade.takeProfit && price <= trade.takeProfit)
          reason = 'take-profit';
      }

      if (reason) {
        accountIds.add(trade.accountId);
        this.logger.log(
          `${reason.toUpperCase()}: ${trade.asset} ${trade.side} at ${price} (entry: ${trade.entryPrice})`,
        );
        await this.closePosition(trade.accountId, trade.asset, reason);
      }
    }
  }

  async getTrades(accountId: string): Promise<PaperTradeEntity[]> {
    return this.tradeRepo.find({
      where: { accountId },
      order: { enteredAt: 'DESC' },
    });
  }

  async getPerformance(accountId: string): Promise<PaperPerformance> {
    const summary = await this.getAccountSummary(accountId);
    const trades = await this.tradeRepo.findBy({ accountId });
    const closed = trades.filter((t) => t.status === 'closed');
    const wins = closed.filter((t) => (t.pnl ?? 0) > 0);

    const bySource: Record<
      string,
      { trades: number; wins: number; totalReturn: number }
    > = {};
    for (const trade of closed) {
      const src = trade.signalSource ?? 'manual';
      const entry = bySource[src] ?? { trades: 0, wins: 0, totalReturn: 0 };
      entry.trades++;
      if ((trade.pnl ?? 0) > 0) entry.wins++;
      entry.totalReturn += trade.pnlPercent ?? 0;
      bySource[src] = entry;
    }

    const bySourceResult: Record<
      string,
      { trades: number; winRate: number; avgReturn: number }
    > = {};
    for (const [src, data] of Object.entries(bySource)) {
      bySourceResult[src] = {
        trades: data.trades,
        winRate: data.trades > 0 ? data.wins / data.trades : 0,
        avgReturn: data.trades > 0 ? data.totalReturn / data.trades : 0,
      };
    }

    return {
      totalValue: summary.totalValue,
      totalReturn: summary.totalReturn,
      totalReturnDollar: summary.totalValue - summary.startingBalance,
      winRate: closed.length > 0 ? wins.length / closed.length : 0,
      totalTrades: trades.length,
      closedTrades: closed.length,
      openPositionCount: summary.openPositions.length,
      bySource: bySourceResult,
    };
  }
}
