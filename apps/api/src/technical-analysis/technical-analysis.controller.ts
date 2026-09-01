import { Controller, Get, Param } from '@nestjs/common';
import { TechnicalAnalysisService } from './technical-analysis.service';

@Controller('technical-analysis')
export class TechnicalAnalysisController {
  constructor(
    private readonly technicalAnalysisService: TechnicalAnalysisService,
  ) {}

  @Get(':symbol')
  async analyze(@Param('symbol') symbol: string) {
    return this.technicalAnalysisService.analyze(symbol, symbol, 'equity');
  }
}
