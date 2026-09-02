import { Controller, Get } from '@nestjs/common';
import { OutcomesService } from './outcomes.service';

@Controller('outcomes')
export class OutcomesController {
  constructor(private readonly outcomesService: OutcomesService) {}

  @Get('leaderboard')
  getLeaderboard() {
    return this.outcomesService.getLeaderboard();
  }

  @Get('by-asset-class')
  getByAssetClass() {
    return this.outcomesService.getAccuracyByAssetClass();
  }

  @Get('evaluate')
  async runEvaluation() {
    const recorded = await this.outcomesService.recordSignalOutcomes();
    const evaluated = await this.outcomesService.evaluatePendingOutcomes();
    return { recorded, evaluated };
  }
}
