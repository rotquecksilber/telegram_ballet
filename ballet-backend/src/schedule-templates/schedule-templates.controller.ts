// schedule-templates.controller.ts
import { Controller, Get, Post, Delete, Body, Param } from '@nestjs/common';
import { ScheduleTemplatesService } from './schedule-templates.service';

@Controller('schedule-templates')
export class ScheduleTemplatesController {
  constructor(private readonly service: ScheduleTemplatesService) {}

  @Get()
  async getAll() {
    return this.service.findAll();
  }

  @Post()
  async create(@Body() body: any) {
    return this.service.create(body);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.service.remove(+id);
  }
}
