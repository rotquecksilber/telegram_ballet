import { Injectable } from '@nestjs/common';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class TelegramService {
  constructor(
      @InjectBot() private readonly bot: Telegraf<any>,
      private readonly supabaseService: SupabaseService,
  ) {}

  async sendNotification(chatId: string | number, text: string) {
    try {
      await this.bot.telegram.sendMessage(chatId, text, { parse_mode: 'Markdown' });
    } catch (e) {
      console.error('Ошибка отправки сообщения:', e);
    }
  }

  // Публичный метод для Cron
  async handleHourlyReminders() {
    const now = new Date();
    let targetTime = new Date(now.getTime() + 60 * 60 * 1000);

    // UTC+4 для твоего пояса
    targetTime = new Date(targetTime.getTime() + 4 * 60 * 60 * 1000);

    targetTime.setSeconds(0);
    targetTime.setMilliseconds(0);

    const dateStr = targetTime.toISOString().split('T')[0]; // YYYY-MM-DD
    const timeStr = targetTime.toTimeString().slice(0, 8);  // HH:MM:SS

    console.log(`[Reminder] Проверяем записи на ${dateStr} ${timeStr}`);

    const { data: bookings, error } = await this.supabaseService.getClient()
        .from('bookings')
        .select(`
        user_id,
        schedule!inner(date, time, classes:class_id(name))
      `)
        .eq('schedule.date', dateStr)
        .eq('schedule.time', timeStr)
        .eq('status', 'confirmed');

    if (error) {
      console.error('[Reminder Error] Ошибка Supabase:', error.message);
      return;
    }

    if (!bookings || bookings.length === 0) {
      console.log('[Reminder] Записей нет.');
      return;
    }

    console.log(`[Reminder] Найдено записей: ${bookings.length}`);

    for (const b of bookings) {
      const className = (b.schedule as any).classes?.name || 'Занятие';
      const msg = `⏰ **Напоминание!**\n\nЧерез час начнется занятие: **${className}**\nНачало в ${timeStr.slice(0, 5)}. Ждем вас! 🩰`;

      await this.sendNotification(b.user_id, msg);
    }
  }

  async handleInactiveUsersReminders() {
    const now = new Date();
    const eightDaysAgo = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);

    const { data: users, error: userError } = await this.supabaseService.getClient()
        .from('users')
        .select('telegram_id, first_name, created_at');

    if (userError || !users) {
      console.error('[Inactive Reminder] Ошибка получения пользователей:', userError?.message);
      return;
    }

    for (const user of users) {
      const { data: lastBooking } = await this.supabaseService.getClient()
          .from('bookings')
          .select('schedule(date)')
          .eq('user_id', user.telegram_id)
          .eq('status', 'attended')
          .order('id', { ascending: false })
          .limit(1)
          .maybeSingle();

      let lastActivityDate: Date;
      if (lastBooking) {
        lastActivityDate = new Date((lastBooking.schedule as any).date);
      } else {
        lastActivityDate = new Date(user.created_at);
      }

      if (lastActivityDate < eightDaysAgo) {
        const { data: futureBooking } = await this.supabaseService.getClient()
            .from('bookings')
            .select('id')
            .eq('user_id', user.telegram_id)
            .eq('status', 'confirmed')
            .gte('schedule.date', now.toISOString().split('T')[0])
            .limit(1);

        if (!futureBooking || futureBooking.length === 0) {
          const msgText = lastBooking
              ? `Вы не заглядывали к нам больше недели. Мы всегда рады видеть вас на занятиях! ✨`
              : `Вы зарегистрировались у нас больше недели назад, но так и не записались на первое занятие. Пора это исправить! 💃`;

          const msg = `👋 **${user.first_name}, скучаем по вам!**\n\n${msgText}\n\nПосмотрите расписание, там много интересного! 🩰`;

          await this.sendNotification(user.telegram_id, msg);
        }
      }
    }
  }
}
