import { Module } from '@nestjs/common';
import { NewsSentimentController } from './news-sentiment.controller';
import { NewsSentimentService } from './news-sentiment.service';
import { SignalsModule } from '../signals/signals.module';

@Module({
  imports: [SignalsModule],
  controllers: [NewsSentimentController],
  providers: [NewsSentimentService],
  exports: [NewsSentimentService],
})
export class NewsSentimentModule {}
