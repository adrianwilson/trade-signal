import { Module } from '@nestjs/common';
import { ResearchAgentService } from './research-agent.service';
import { LlmModule } from '../llm/llm.module';
import { NewsSentimentModule } from '../news-sentiment/news-sentiment.module';
import { TechnicalAnalysisModule } from '../technical-analysis/technical-analysis.module';
import { MarketDataModule } from '../market-data/market-data.module';
import { SignalsModule } from '../signals/signals.module';

@Module({
  imports: [
    LlmModule,
    NewsSentimentModule,
    TechnicalAnalysisModule,
    MarketDataModule,
    SignalsModule,
  ],
  providers: [ResearchAgentService],
})
export class ResearchAgentModule {}
