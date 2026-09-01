import {
  Controller,
  Get,
  Param,
  Query,
  NotFoundException,
} from '@nestjs/common';
import { MarketDataService } from './market-data.service';

@Controller('market-data')
export class MarketDataController {
  constructor(private readonly marketDataService: MarketDataService) {}

  @Get('quote/:symbol')
  async getQuote(@Param('symbol') symbol: string) {
    const quote = await this.marketDataService.getQuote(symbol);
    if (!quote) {
      throw new NotFoundException(`No quote data for symbol "${symbol}"`);
    }
    return quote;
  }

  @Get('history/:symbol')
  async getHistory(
    @Param('symbol') symbol: string,
    @Query('days') days?: string,
  ) {
    return this.marketDataService.getHistory(
      symbol,
      days ? parseInt(days) : 30,
    );
  }

  @Get('quotes')
  async getBulkQuotes() {
    return this.marketDataService.getBulkQuotes();
  }
}
