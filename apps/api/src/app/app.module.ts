import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
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

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database:
        process.env['NODE_ENV'] === 'test' ? ':memory:' : 'data/signals.sqlite',
      entities: [
        SignalEntity,
        AssetPriceEntity,
        UserEntity,
        WatchlistEntity,
        AlertEntity,
        PortfolioEntity,
        OutcomeEntity,
      ],
      synchronize: true,
    }),
    ScheduleModule.forRoot(),
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
