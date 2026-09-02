import {
  Controller,
  Get,
  Patch,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  getAlerts(@Request() req: { user: { id: string } }) {
    return this.alertsService.getByUser(req.user.id);
  }

  @Get('unread-count')
  getUnreadCount(@Request() req: { user: { id: string } }) {
    return this.alertsService.getUnreadCount(req.user.id);
  }

  @Get('generate')
  generateAlerts(@Request() req: { user: { id: string } }) {
    return this.alertsService.generateAlerts(req.user.id);
  }

  @Patch(':id/read')
  markAsRead(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    return this.alertsService.markAsRead(req.user.id, id);
  }

  @Patch('read-all')
  markAllAsRead(@Request() req: { user: { id: string } }) {
    return this.alertsService.markAllAsRead(req.user.id);
  }
}
