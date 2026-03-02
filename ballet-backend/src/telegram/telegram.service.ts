import { Injectable } from '@nestjs/common';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import { Cron, CronExpression } from '@nestjs/schedule';
import {SupabaseService} from "src/supabase/supabase.service";

@Injectable()
export class TelegramService {
  constructor(@InjectBot() private readonly bot: Telegraf<any>,
              private readonly supabaseService: SupabaseService) {}

  async sendNotification(chatId: string | number, text: string) {
    try {
      await this.bot.telegram.sendMessage(chatId, text, { parse_mode: 'Markdown' });
    } catch (e) {
      console.error('Ошибка отправки сообщения:', e);
    }
  }
  @Cron(CronExpression.EVERY_MINUTE)
  async handleHourlyReminders() {
    const now = new Date();
    // Время через 60 минут
    const targetTime = new Date(now.getTime() + 60 * 60 * 1000);

    const dateStr = targetTime.toISOString().split('T')[0];
    const timeStr = targetTime.toTimeString().slice(0, 5) + ':00';

    const { data: bookings, error } = await this.supabaseService.getClient()
        .from('bookings')
        .select(`
        user_id,
        schedule!inner(date, time, classes:class_id(name))
      `)
        .eq('schedule.date', dateStr)
        .eq('schedule.time', timeStr)
        .eq('status', 'confirmed');

    if (error || !bookings || bookings.length === 0) return;


    for (const b of bookings) {
      const className = (b.schedule as any).classes?.name || 'Занятие';
      const msg = `⏰ **Напоминание!**\n\nЧерез час начнется занятие: **${className}**\nНачало в ${timeStr.slice(0, 5)}. Ждем вас! 🩰`;

      await this.sendNotification(b.user_id, msg);
    }
  }
}
