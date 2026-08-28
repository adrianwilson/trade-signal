import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  NotFoundException,
} from '@nestjs/common';
import { SignalsService } from './signals.service';
import type { ManualSignalInput } from '@org/signals';

@Controller('signals')
export class SignalsController {
  constructor(private readonly signalsService: SignalsService) {}

  @Get()
  findAll() {
    return this.signalsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    const signal = this.signalsService.findOne(id);
    if (!signal) {
      throw new NotFoundException(`Signal with id "${id}" not found`);
    }
    return signal;
  }

  @Post()
  create(@Body() input: ManualSignalInput) {
    return this.signalsService.create(input);
  }
}
