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
import { PortfolioService } from './portfolio.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('portfolio')
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  @Get()
  getPortfolio(@Request() req: { user: { id: string } }) {
    return this.portfolioService.getByUser(req.user.id);
  }

  @Post()
  addPosition(
    @Request() req: { user: { id: string } },
    @Body()
    body: {
      asset: string;
      assetClass: string;
      quantity: number;
      avgPrice: number;
    },
  ) {
    return this.portfolioService.addPosition(
      req.user.id,
      body.asset,
      body.assetClass,
      body.quantity,
      body.avgPrice,
    );
  }

  @Post('import')
  importCsv(
    @Request() req: { user: { id: string } },
    @Body() body: { csv: string },
  ) {
    return this.portfolioService.importCsv(req.user.id, body.csv);
  }

  @Delete(':asset')
  removePosition(
    @Request() req: { user: { id: string } },
    @Param('asset') asset: string,
  ) {
    return this.portfolioService.removePosition(req.user.id, asset);
  }
}
