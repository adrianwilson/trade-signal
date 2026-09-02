import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OutcomesController } from './outcomes.controller';
import { OutcomesService } from './outcomes.service';
import { OutcomeEntity } from './outcome.entity';
import { SignalsModule } from '../signals/signals.module';
import { MarketDataModule } from '../market-data/market-data.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([OutcomeEntity]),
    SignalsModule,
    MarketDataModule,
  ],
  controllers: [OutcomesController],
  providers: [OutcomesService],
})
export class OutcomesModule {}
