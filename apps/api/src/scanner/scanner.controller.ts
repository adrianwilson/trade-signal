import { Controller, Get } from '@nestjs/common';
import { ScannerService } from './scanner.service';

@Controller('scanner')
export class ScannerController {
  constructor(private readonly scannerService: ScannerService) {}

  @Get('opportunities')
  getOpportunities() {
    return this.scannerService.getOpportunities();
  }
}
