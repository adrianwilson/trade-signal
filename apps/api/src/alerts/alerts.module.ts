import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';
import { AlertEntity } from './alert.entity';
import { WatchlistModule } from '../watchlist/watchlist.module';
import { SynthesisModule } from '../synthesis/synthesis.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AlertEntity]),
    WatchlistModule,
    SynthesisModule,
  ],
  controllers: [AlertsController],
  providers: [AlertsService],
})
export class AlertsModule {}
