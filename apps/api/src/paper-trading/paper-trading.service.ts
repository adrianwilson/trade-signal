import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaperAccountEntity, PaperTradeEntity } from './paper-trading.entities';
import { SignalsService } from '../signals/signals.service';
import { MarketDataService } from '../market-data/market-data.service';
import { randomUUID } from 'crypto';

const STARTING_BALANCE = 100_000;

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
      { quantity: number; totalCost: number; asset: string }
    >();
    for (const trade of openTrades) {
      const pos = positions.get(trade.asset) ?? {
        quantity: 0,
        totalCost: 0,
        asset: trade.asset,
      };
      pos.quantity += trade.quantity;
      pos.totalCost += trade.quantity * trade.entryPrice;
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
    const quantity = Math.floor(positionSize / quote.price);
    if (quantity <= 0) throw new NotFoundException('Insufficient funds');

    const cost = quantity * quote.price;

    const trade: PaperTradeEntity = {
      id: randomUUID(),
      accountId,
      asset: signal.asset,
      assetClass: signal.assetClass,
      side: signal.direction === 'BUY' ? 'buy' : 'sell',
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
    };

    await this.tradeRepo.save(trade);

    account.cashBalance -= cost;
    await this.accountRepo.save(account);

    return trade;
  }

  async closePosition(
    accountId: string,
    asset: string,
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
      await this.tradeRepo.save(trade);
      account.cashBalance += exitPrice * trade.quantity;
    }

    await this.accountRepo.save(account);
    return openTrades;
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
