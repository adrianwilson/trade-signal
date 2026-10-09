import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule, type TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EventsModule } from '../events/events.module';
import { SignalsModule } from '../signals/signals.module';
import { SignalEntity } from '../signals/signal.entity';
import { MarketDataModule } from '../market-data/market-data.module';
import { AssetPriceEntity } from '../market-data/asset-price.entity';
import { TechnicalAnalysisModule } from '../technical-analysis/technical-analysis.module';
import { NewsSentimentModule } from '../news-sentiment/news-sentiment.module';
import { SynthesisModule } from '../synthesis/synthesis.module';
import { AuthModule } from '../auth/auth.module';
import { UserEntity } from '../auth/user.entity';
import { WatchlistModule } from '../watchlist/watchlist.module';
import { WatchlistEntity } from '../watchlist/watchlist.entity';
import { AlertsModule } from '../alerts/alerts.module';
import { AlertEntity } from '../alerts/alert.entity';
import { PortfolioModule } from '../portfolio/portfolio.module';
import { PortfolioEntity } from '../portfolio/portfolio.entity';
import { OutcomesModule } from '../outcomes/outcomes.module';
import { OutcomeEntity } from '../outcomes/outcome.entity';
import { PaperTradingModule } from '../paper-trading/paper-trading.module';
import {
  PaperAccountEntity,
  PaperTradeEntity,
} from '../paper-trading/paper-trading.entities';
import { ScannerModule } from '../scanner/scanner.module';
import { ResearchAgentModule } from '../research-agent/research-agent.module';

const entities = [
  SignalEntity,
  AssetPriceEntity,
  UserEntity,
  WatchlistEntity,
  AlertEntity,
  PortfolioEntity,
  OutcomeEntity,
  PaperAccountEntity,
  PaperTradeEntity,
];

function buildDbConfig(): TypeOrmModuleOptions {
  if (process.env['NODE_ENV'] === 'test') {
    return {
      type: 'better-sqlite3',
      database: ':memory:',
      entities,
      synchronize: true,
    };
  }

  const databaseUrl = process.env['DATABASE_URL'];
  if (databaseUrl) {
    return {
      type: 'postgres',
      url: databaseUrl,
      ssl: { rejectUnauthorized: false },
      entities,
      synchronize: true,
    };
  }

  return {
    type: 'better-sqlite3',
    database: 'data/signals.sqlite',
    entities,
    synchronize: true,
  };
}

@Module({
  imports: [
    TypeOrmModule.forRoot(buildDbConfig()),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60000, limit: 100 }],
    }),
    EventsModule,
    SignalsModule,
    MarketDataModule,
    TechnicalAnalysisModule,
    NewsSentimentModule,
    SynthesisModule,
    AuthModule,
    WatchlistModule,
    AlertsModule,
    PortfolioModule,
    OutcomesModule,
    PaperTradingModule,
    ScannerModule,
    ResearchAgentModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
