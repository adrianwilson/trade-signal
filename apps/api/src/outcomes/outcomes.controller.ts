import { Controller, Get, Query } from '@nestjs/common';
import { OutcomesService } from './outcomes.service';

@Controller('outcomes')
export class OutcomesController {
  constructor(private readonly outcomesService: OutcomesService) {}

  @Get('leaderboard')
  getLeaderboard(@Query('window') window?: string) {
    const windowDays = window ? parseInt(window, 10) : undefined;
    return this.outcomesService.getLeaderboard(
      windowDays && !isNaN(windowDays) ? windowDays : undefined,
    );
  }

  @Get('by-asset-class')
  getByAssetClass() {
    return this.outcomesService.getAccuracyByAssetClass();
  }

  @Get('calibration')
  getCalibration() {
    return this.outcomesService.getCalibration();
  }

  @Get('retrospective')
  getRetrospective() {
    return this.outcomesService.getRetrospective();
  }

  @Get('evaluate')
  async runEvaluation() {
    const recorded = await this.outcomesService.recordSignalOutcomes();
    const evaluated = await this.outcomesService.evaluatePendingOutcomes();
    return { recorded, evaluated };
  }
}
