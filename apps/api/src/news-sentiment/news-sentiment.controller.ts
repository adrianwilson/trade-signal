import { Controller, Get, Param } from '@nestjs/common';
import { NewsSentimentService } from './news-sentiment.service';

@Controller('news-sentiment')
export class NewsSentimentController {
  constructor(private readonly newsSentimentService: NewsSentimentService) {}

  @Get()
  async getAll() {
    const cached = this.newsSentimentService.getAllSentiment();
    if (cached.length > 0) return cached;
    await this.newsSentimentService.runSentimentAnalysis();
    return this.newsSentimentService.getAllSentiment();
  }

  @Get(':symbol')
  async analyze(@Param('symbol') symbol: string) {
    return this.newsSentimentService.analyzeSentiment(symbol, symbol);
  }
}
