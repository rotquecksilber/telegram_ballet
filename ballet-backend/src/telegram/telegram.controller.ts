import { Controller, Post, Body } from '@nestjs/common';
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
}
