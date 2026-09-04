import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaperTradingController } from './paper-trading.controller';
import { PaperTradingService } from './paper-trading.service';
import { PaperAccountEntity, PaperTradeEntity } from './paper-trading.entities';
import { SignalsModule } from '../signals/signals.module';
import { MarketDataModule } from '../market-data/market-data.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PaperAccountEntity, PaperTradeEntity]),
    SignalsModule,
    MarketDataModule,
  ],
  controllers: [PaperTradingController],
  providers: [PaperTradingService],
})
export class PaperTradingModule {}
