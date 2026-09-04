import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { PaperTradingService } from './paper-trading.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('paper')
export class PaperTradingController {
  constructor(private readonly paperService: PaperTradingService) {}

  @Post('accounts')
  createAccount(
    @Request() req: { user: { id: string } },
    @Body() body: { name?: string },
  ) {
    return this.paperService.createAccount(req.user.id, body.name);
  }

  @Get('accounts')
  getAccounts(@Request() req: { user: { id: string } }) {
    return this.paperService.getAccounts(req.user.id);
  }

  @Get('accounts/:id')
  getAccountSummary(@Param('id') id: string) {
    return this.paperService.getAccountSummary(id);
  }

  @Post('accounts/:id/follow-signal')
  followSignal(@Param('id') id: string, @Body() body: { signalId: string }) {
    return this.paperService.followSignal(id, body.signalId);
  }

  @Post('accounts/:id/close/:asset')
  closePosition(@Param('id') id: string, @Param('asset') asset: string) {
    return this.paperService.closePosition(id, asset);
  }

  @Post('accounts/:id/reset')
  resetAccount(@Param('id') id: string) {
    return this.paperService.resetAccount(id);
  }

  @Get('accounts/:id/trades')
  getTrades(@Param('id') id: string) {
    return this.paperService.getTrades(id);
  }

  @Get('accounts/:id/performance')
  getPerformance(@Param('id') id: string) {
    return this.paperService.getPerformance(id);
  }
}
