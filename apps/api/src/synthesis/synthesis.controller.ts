import { Controller, Get, Param, Query } from '@nestjs/common';
import { SynthesisService } from './synthesis.service';

@Controller('synthesis')
export class SynthesisController {
  constructor(private readonly synthesisService: SynthesisService) {}

  @Get()
  async getAll(@Query('timeframe') timeframe?: string) {
    // Only trigger full synthesis if cache is completely empty
    const allCached = this.synthesisService.getAll();
    if (allCached.length === 0) {
      await this.synthesisService.synthesize();
    }
    return this.synthesisService.getAll(timeframe);
  }

  @Get(':asset')
  getByAsset(@Param('asset') asset: string) {
    return this.synthesisService.getByAsset(asset);
  }
}
