import { Module } from '@nestjs/common';
import { ScannerController } from './scanner.controller';
import { ScannerService } from './scanner.service';
import { TechnicalAnalysisModule } from '../technical-analysis/technical-analysis.module';
import { MarketDataModule } from '../market-data/market-data.module';

@Module({
  imports: [TechnicalAnalysisModule, MarketDataModule],
  controllers: [ScannerController],
  providers: [ScannerService],
})
export class ScannerModule {}
