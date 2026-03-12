import {Controller, Post, Body, Param, Get, BadRequestException} from '@nestjs/common';
import { TelegramService } from './telegram.service';

@Controller('telegram')
export class TelegramController {
  constructor(private readonly telegramService: TelegramService) {}

  @Post('send')
  async sendNotification(@Body() data: { chatId: number; text: string }) {
    await this.telegramService.sendNotification(data.chatId, data.text);
    return {
      success: true,
      message: 'Уведомление отправлено'
    };
  }
  @Post('stars-donate')
  async createDonate(@Body() dto: { userId: number }) {
    try {
      const link = await this.telegramService.createDonateInvoiceLink(dto.userId);

      if (!link) {
        return { success: false, error: 'Не удалось создать инвойс' };
      }

      return { success: true, link };
    } catch (error: any) {
      console.error('[stars-donate] Ошибка:', error.message || error);
      return {
        success: false,
        error: error.message || 'Внутренняя ошибка сервера',
      };
    }
  }
  @Post('broadcast')
  async broadcast(@Body('message') message: string) {
    if (!message || message.trim() === '') {
      throw new BadRequestException('Message cannot be empty');
    }

    // Вызываем сервис для рассылки
    await this.telegramService.broadcastMessage(message);

    return { success: true, message: 'Message sent to all users' };
  }

}
