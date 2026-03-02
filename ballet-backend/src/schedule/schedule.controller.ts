import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  Param,
  Patch,
  Post,
  Put
} from '@nestjs/common';
import {ScheduleService} from './schedule.service';

@Controller('schedule')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Get()
  async getActualSchedule() {
    try {
      // Используем метод с фильтрацией даты по умолчанию
      return await this.scheduleService.findActual();
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Если админу вдруг нужно ВСЁ расписание (включая историю)
  @Get('all')
  async getAll() {
    return await this.scheduleService.findAll();
  }

  @Post()
  async createEntry(@Body() body: any) {
    try {
      return await this.scheduleService.create(body);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Delete(':id')
  async removeEntry(@Param('id') id: string) {
    try {
      return await this.scheduleService.remove(Number(id));
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.scheduleService.updateStatus(Number(id), status);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: any) {
    return this.scheduleService.update(Number(id), dto);
  }

  @Post('deploy')
  async deploy(@Body() body: { day_of_week: number; date: string }) {
    const { day_of_week, date } = body;

    // Небольшая валидация входных данных
    if (day_of_week === undefined || !date) {
      throw new BadRequestException('day_of_week and date are required');
    }

    const result = await this.scheduleService.deployTemplates(day_of_week, date);

    if (!result || result.error) {
      throw new InternalServerErrorException(result?.error?.message || 'Failed to deploy templates');
    }

    return {
      success: true,
      message: `Templates for day ${day_of_week} successfully deployed to ${date}`,
      count: result.data?.length
    };
  }
}
