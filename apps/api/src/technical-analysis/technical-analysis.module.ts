import { Module } from '@nestjs/common';
import { TechnicalAnalysisController } from './technical-analysis.controller';
import { TechnicalAnalysisService } from './technical-analysis.service';
import { MarketDataModule } from '../market-data/market-data.module';
import { SignalsModule } from '../signals/signals.module';

@Module({
  imports: [MarketDataModule, SignalsModule],
  controllers: [TechnicalAnalysisController],
  providers: [TechnicalAnalysisService],
})
export class TechnicalAnalysisModule {}
