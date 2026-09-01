import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SignalsModule } from '../signals/signals.module';
import { SignalEntity } from '../signals/signal.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database:
        process.env['NODE_ENV'] === 'test' ? ':memory:' : 'data/signals.sqlite',
      entities: [SignalEntity],
      synchronize: true,
    }),
    SignalsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
