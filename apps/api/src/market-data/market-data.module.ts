import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketDataController } from './market-data.controller';
import { MarketDataService } from './market-data.service';
import { AssetPriceEntity } from './asset-price.entity';
import { SignalsModule } from '../signals/signals.module';
import { CoinGeckoService } from './coingecko.service';

@Module({
  imports: [TypeOrmModule.forFeature([AssetPriceEntity]), SignalsModule],
  controllers: [MarketDataController],
  providers: [MarketDataService, CoinGeckoService],
  exports: [MarketDataService, CoinGeckoService],
})
export class MarketDataModule {}
