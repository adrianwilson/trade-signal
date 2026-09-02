import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AlertEntity } from './alert.entity';
import { WatchlistService } from '../watchlist/watchlist.service';
import { SynthesisService } from '../synthesis/synthesis.service';
import { randomUUID } from 'crypto';

export interface Alert {
  id: string;
  asset: string;
  direction: string;
  confidence: number;
  message: string;
  read: boolean;
  createdAt: string;
}

@Injectable()
export class AlertsService {
  private readonly confidenceThreshold = 70;

  constructor(
    @InjectRepository(AlertEntity)
    private readonly repository: Repository<AlertEntity>,
    private readonly watchlistService: WatchlistService,
    private readonly synthesisService: SynthesisService,
  ) {}

  async getByUser(userId: string): Promise<Alert[]> {
    const entities = await this.repository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
    return entities.map(this.toAlert);
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.repository.countBy({ userId, read: 0 });
  }

  async markAsRead(userId: string, alertId: string): Promise<void> {
    await this.repository.update({ id: alertId, userId }, { read: 1 });
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.repository.update({ userId, read: 0 }, { read: 1 });
  }

  async generateAlerts(userId: string): Promise<Alert[]> {
    const watchlist = await this.watchlistService.getByUser(userId);
    if (watchlist.length === 0) return [];

    const syntheses = this.synthesisService.getAll();
    const watchedAssets = new Set(watchlist.map((w) => w.asset));
    const generated: Alert[] = [];

    for (const synthesis of syntheses) {
      if (!watchedAssets.has(synthesis.asset)) continue;
      if (synthesis.direction === 'HOLD') continue;
      if (synthesis.confidence < this.confidenceThreshold) continue;

      const existing = await this.repository.findOneBy({
        userId,
        asset: synthesis.asset,
        direction: synthesis.direction,
        createdAt: synthesis.lastUpdated,
      });
      if (existing) continue;

      const entity: AlertEntity = {
        id: randomUUID(),
        userId,
        asset: synthesis.asset,
        direction: synthesis.direction,
        confidence: synthesis.confidence,
        message: `${synthesis.asset}: ${synthesis.direction} signal at ${synthesis.confidence}% confidence`,
        read: 0,
        createdAt: synthesis.lastUpdated,
      };

      await this.repository.save(entity);
      generated.push(this.toAlert(entity));
    }

    return generated;
  }

  private toAlert(entity: AlertEntity): Alert {
    return {
      id: entity.id,
      asset: entity.asset,
      direction: entity.direction,
      confidence: entity.confidence,
      message: entity.message,
      read: entity.read === 1,
      createdAt: entity.createdAt,
    };
  }
}
