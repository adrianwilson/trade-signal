import { Module } from '@nestjs/common';
import { SynthesisController } from './synthesis.controller';
import { SynthesisService } from './synthesis.service';
import { SignalsModule } from '../signals/signals.module';

@Module({
  imports: [SignalsModule],
  controllers: [SynthesisController],
  providers: [SynthesisService],
  exports: [SynthesisService],
})
export class SynthesisModule {}
