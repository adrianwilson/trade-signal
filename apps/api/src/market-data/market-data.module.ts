import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketDataController } from './market-data.controller';
import { MarketDataService } from './market-data.service';
import { AssetPriceEntity } from './asset-price.entity';
import { SignalsModule } from '../signals/signals.module';

@Module({
  imports: [TypeOrmModule.forFeature([AssetPriceEntity]), SignalsModule],
  controllers: [MarketDataController],
  providers: [MarketDataService],
})
export class MarketDataModule {}
