import { Module } from '@nestjs/common';
import { SynthesisController } from './synthesis.controller';
import { SynthesisService } from './synthesis.service';
import { SignalsModule } from '../signals/signals.module';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [SignalsModule, LlmModule],
  controllers: [SynthesisController],
  providers: [SynthesisService],
  exports: [SynthesisService],
})
export class SynthesisModule {}
