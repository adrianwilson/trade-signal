import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { WatchlistService } from './watchlist.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('watchlist')
export class WatchlistController {
  constructor(private readonly watchlistService: WatchlistService) {}

  @Get()
  getWatchlist(@Request() req: { user: { id: string } }) {
    return this.watchlistService.getByUser(req.user.id);
  }

  @Post()
  addToWatchlist(
    @Request() req: { user: { id: string } },
    @Body() body: { asset: string; assetClass: string },
  ) {
    return this.watchlistService.add(req.user.id, body.asset, body.assetClass);
  }

  @Delete(':asset')
  removeFromWatchlist(
    @Request() req: { user: { id: string } },
    @Param('asset') asset: string,
  ) {
    return this.watchlistService.remove(req.user.id, asset);
  }
}
