import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Delete,
  Patch,
  ParseIntPipe
} from '@nestjs/common';
import { BookingsService } from './bookings.service';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  /**
   * Записаться на занятие
   * POST /bookings
   */
  @Post()
  async create(
      @Body() dto: { user_id: number; schedule_id: number; subscription_id: number }
  ) {
    return await this.bookingsService.create(dto);
  }

  /**
   * Получить историю записей конкретного пользователя
   * GET /bookings/user/123
   */
  @Get('user/:userId')
  async findAllByUser(@Param('userId', ParseIntPipe) userId: number) {
    return await this.bookingsService.findAllByUser(userId);
  }

  /**
   * Получить список всех записавшихся на конкретное занятие (для админа)
   * GET /bookings/schedule/456
   */
  @Get('schedule/:scheduleId')
  async findBySchedule(@Param('scheduleId', ParseIntPipe) scheduleId: number) {
    return await this.bookingsService.findBySchedule(scheduleId);
  }

  /**
   * Отменить запись (учеником)
   * PATCH /bookings/789/cancel
   */
  @Patch(':id/cancel')
  async cancel(@Param('id', ParseIntPipe) id: number) {
    return await this.bookingsService.cancel(id);
  }

  /**
   * Списать занятие с абонемента (для админа)
   * PATCH /bookings/789/debit
   */
  @Post(':id/debit')
  async debit(@Param('id', ParseIntPipe) id: number) {
    return await this.bookingsService.debitLesson(id);
  }

  /**
   * Полностью удалить запись (админ-функция)
   * DELETE /bookings/789
   */
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return await this.bookingsService.remove(id);
  }
  @Get('date/:date')
  async findByDate(@Param('date') date: string) {
    return await this.bookingsService.findByDate(date);
  }

  @Patch(':id/attendance')
  async updateAttendance(
      @Param('id') id: string,
      @Body('is_attended') is_attended: boolean | null // Извлекаем поле напрямую из Body
  ) {
    return this.bookingsService.setAttendance(id, is_attended);
  }
}
