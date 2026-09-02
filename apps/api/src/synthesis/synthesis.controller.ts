import { Controller, Get, Param } from '@nestjs/common';
import { SynthesisService } from './synthesis.service';

@Controller('synthesis')
export class SynthesisController {
  constructor(private readonly synthesisService: SynthesisService) {}

  @Get()
  async getAll() {
    const cached = this.synthesisService.getAll();
    if (cached.length > 0) return cached;
    return this.synthesisService.synthesize();
  }

  @Get(':asset')
  getByAsset(@Param('asset') asset: string) {
    return this.synthesisService.getByAsset(asset);
  }
}
