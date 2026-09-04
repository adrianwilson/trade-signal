import { Controller, Get, Param, Query } from '@nestjs/common';
import { TechnicalAnalysisService } from './technical-analysis.service';
import type { Timeframe } from '@org/signals';
import { TIMEFRAME_CONFIG } from './timeframes';

@Controller('technical-analysis')
export class TechnicalAnalysisController {
  constructor(
    private readonly technicalAnalysisService: TechnicalAnalysisService,
  ) {}

  @Get(':symbol')
  async analyze(
    @Param('symbol') symbol: string,
    @Query('timeframe') timeframe?: string,
  ) {
    const tf =
      timeframe && timeframe in TIMEFRAME_CONFIG
        ? (timeframe as Timeframe)
        : 'swing';
    return this.technicalAnalysisService.analyzeTimeframe(
      symbol,
      symbol,
      'equity',
      tf,
    );
  }
}
