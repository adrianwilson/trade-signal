import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { JevService } from './jev/jev.service';
import { MemoryService } from './memory/memory.service';
import { NotifierService } from './notifier/notifier.service';
import { HealthWatcherService } from './health/health-watcher.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [
    JevService,
    MemoryService,
    NotifierService,
    HealthWatcherService,
  ],
})
export class AgentModule {}
