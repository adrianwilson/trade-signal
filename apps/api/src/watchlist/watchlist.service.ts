import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WatchlistEntity } from './watchlist.entity';
import { randomUUID } from 'crypto';

export interface WatchlistItem {
  id: string;
  asset: string;
  assetClass: string;
  addedAt: string;
}

@Injectable()
export class WatchlistService {
  constructor(
    @InjectRepository(WatchlistEntity)
    private readonly repository: Repository<WatchlistEntity>,
  ) {}

  async getByUser(userId: string): Promise<WatchlistItem[]> {
    const items = await this.repository.findBy({ userId });
    return items.map(({ id, asset, assetClass, addedAt }) => ({
      id,
      asset,
      assetClass,
      addedAt,
    }));
  }

  async add(
    userId: string,
    asset: string,
    assetClass: string,
  ): Promise<WatchlistItem> {
    const existing = await this.repository.findOneBy({ userId, asset });
    if (existing) {
      throw new ConflictException(`${asset} is already in your watchlist`);
    }

    const entity: WatchlistEntity = {
      id: randomUUID(),
      userId,
      asset,
      assetClass,
      addedAt: new Date().toISOString(),
    };

    await this.repository.save(entity);
    return {
      id: entity.id,
      asset: entity.asset,
      assetClass: entity.assetClass,
      addedAt: entity.addedAt,
    };
  }

  async remove(userId: string, asset: string): Promise<void> {
    await this.repository.delete({ userId, asset });
  }

  async isWatched(userId: string, asset: string): Promise<boolean> {
    const item = await this.repository.findOneBy({ userId, asset });
    return !!item;
  }
}
