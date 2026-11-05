import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { JevService } from './jev/jev.service';
import { MemoryService } from './memory/memory.service';
import { NotifierService } from './notifier/notifier.service';
import { HealthWatcherService } from './health/health-watcher.service';
import { SignalWatcherService } from './signal-watcher/signal-watcher.service';
import { InvestigatorService } from './investigator/investigator.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [
    JevService,
    MemoryService,
    NotifierService,
    HealthWatcherService,
    SignalWatcherService,
    InvestigatorService,
  ],
})
export class AgentModule {}
