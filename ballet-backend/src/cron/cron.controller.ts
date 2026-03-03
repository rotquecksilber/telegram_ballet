import { Controller, Get, Req } from '@nestjs/common';
import { Request } from 'express';
import { TelegramService } from '../telegram/telegram.service';

@Controller('api/cron')
export class CronController {
    constructor(private readonly telegramService: TelegramService) {}

    @Get()
    async handleCron(@Req() request: Request) {
        const cronSecret = request.headers['authorization'];
        if (cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
            return { status: 401, message: 'Unauthorized' };
        }

        console.log('Cron job ran at:', new Date().toISOString());

        // Вызываем методы сервиса
        await this.telegramService.handleHourlyReminders();
        await this.telegramService.handleInactiveUsersReminders();

        return { status: 200, message: 'Task complete' };
    }
}
