import { Controller, Get, Param, Query } from '@nestjs/common';
import { SynthesisService } from './synthesis.service';

@Controller('synthesis')
export class SynthesisController {
  constructor(private readonly synthesisService: SynthesisService) {}

  @Get()
  async getAll(@Query('timeframe') timeframe?: string) {
    const cached = this.synthesisService.getAll(timeframe);
    if (cached.length > 0) return cached;
    const results = await this.synthesisService.synthesize();
    if (!timeframe || timeframe === 'all') return results;
    return results.filter((s) => s.timeframe === timeframe);
  }

  @Get(':asset')
  getByAsset(@Param('asset') asset: string) {
    return this.synthesisService.getByAsset(asset);
  }
}
