import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PortfolioEntity } from './portfolio.entity';
import { randomUUID } from 'crypto';

export interface PortfolioPosition {
  id: string;
  asset: string;
  assetClass: string;
  quantity: number;
  avgPrice: number;
  addedAt: string;
}

export interface PortfolioWithPnL extends PortfolioPosition {
  currentPrice?: number;
  marketValue?: number;
  pnl?: number;
  pnlPercent?: number;
}

@Injectable()
export class PortfolioService {
  constructor(
    @InjectRepository(PortfolioEntity)
    private readonly repository: Repository<PortfolioEntity>,
  ) {}

  async getByUser(userId: string): Promise<PortfolioPosition[]> {
    const items = await this.repository.findBy({ userId });
    return items.map(this.toPosition);
  }

  async addPosition(
    userId: string,
    asset: string,
    assetClass: string,
    quantity: number,
    avgPrice: number,
  ): Promise<PortfolioPosition> {
    const existing = await this.repository.findOneBy({ userId, asset });
    if (existing) {
      // Average in: update quantity and weighted avg price
      const totalQty = existing.quantity + quantity;
      const weightedPrice =
        (existing.quantity * existing.avgPrice + quantity * avgPrice) /
        totalQty;
      existing.quantity = totalQty;
      existing.avgPrice = weightedPrice;
      await this.repository.save(existing);
      return this.toPosition(existing);
    }

    const entity: PortfolioEntity = {
      id: randomUUID(),
      userId,
      asset,
      assetClass,
      quantity,
      avgPrice,
      addedAt: new Date().toISOString(),
    };

    await this.repository.save(entity);
    return this.toPosition(entity);
  }

  async importCsv(
    userId: string,
    csvContent: string,
  ): Promise<PortfolioPosition[]> {
    const lines = csvContent.trim().split('\n');
    const results: PortfolioPosition[] = [];

    // Skip header if present
    const start = lines[0]?.includes('asset') ? 1 : 0;

    for (let i = start; i < lines.length; i++) {
      const parts = lines[i].split(',').map((s) => s.trim());
      if (parts.length < 3) continue;

      const [asset, quantityStr, avgPriceStr, assetClass] = parts;
      const quantity = parseFloat(quantityStr);
      const avgPrice = parseFloat(avgPriceStr);

      if (isNaN(quantity) || isNaN(avgPrice)) continue;

      const position = await this.addPosition(
        userId,
        asset,
        assetClass || 'equity',
        quantity,
        avgPrice,
      );
      results.push(position);
    }

    return results;
  }

  async removePosition(userId: string, asset: string): Promise<void> {
    await this.repository.delete({ userId, asset });
  }

  private toPosition(entity: PortfolioEntity): PortfolioPosition {
    return {
      id: entity.id,
      asset: entity.asset,
      assetClass: entity.assetClass,
      quantity: entity.quantity,
      avgPrice: entity.avgPrice,
      addedAt: entity.addedAt,
    };
  }
}
