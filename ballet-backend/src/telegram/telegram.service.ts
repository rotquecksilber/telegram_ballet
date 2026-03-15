import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf, Context } from 'telegraf';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class TelegramService implements OnModuleInit {
  constructor(
      @InjectBot() private readonly bot: Telegraf<Context>,
      private readonly supabaseService: SupabaseService,
  ) {}

  async onModuleInit() {
    this.bot.on('pre_checkout_query', async (ctx) => {
      try {
        await ctx.answerPreCheckoutQuery(true);
      } catch {}
    });

    this.bot.on('successful_payment', async (ctx) => {
      const payment = ctx.message?.successful_payment;
      if (!payment) return;

      try {
        await ctx.reply('✨ Огромное спасибо за поддержку ⭐❤️');
      } catch {}
    });
  }

  async sendNotification(chatId: string | number, text: string) {
    try {
      await this.bot.telegram.sendMessage(chatId, text, { parse_mode: 'Markdown' });
    } catch {}
  }

  async handleInactiveUsersReminders() {
    const now = new Date();
    const eightDaysAgo = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);

    const { data: users, error } = await this.supabaseService.getClient()
        .from('users')
        .select('telegram_id, first_name, created_at, last_reminder_sent_at')
        // берём всех, у кого либо вообще не отправляли, либо отправляли давно
        .or(`last_reminder_sent_at.is.null,last_reminder_sent_at.lt.${eightDaysAgo.toISOString()}`);

    if (error || !users?.length) return;

    for (const user of users) {
      // ─── Определяем дату последней активности ────────────────────────
      const { data: lastBooking } = await this.supabaseService.getClient()
          .from('bookings')
          .select('schedule(date)')
          .eq('user_id', user.telegram_id)
          .eq('status', 'attended')
          .order('id', { ascending: false })
          .limit(1)
          .maybeSingle();

      const lastActivityDate = lastBooking
          ? new Date((lastBooking.schedule as any).date)
          : new Date(user.created_at);

      if (lastActivityDate >= eightDaysAgo) continue; // ещё активен

      // ─── Есть ли подтверждённая запись в будущем? ────────────────────
      const { data: future } = await this.supabaseService.getClient()
          .from('bookings')
          .select('id')
          .eq('user_id', user.telegram_id)
          .eq('status', 'confirmed')
          .gte('schedule->>date', now.toISOString().split('T')[0])
          .limit(1);

      if (future?.length) continue; // есть запись → не беспокоим

      // ─── Отправляем напоминание ──────────────────────────────────────
      const msgText = lastBooking
          ? `Вы не заглядывали к нам больше недели. Мы всегда рады видеть вас на занятиях! ✨`
          : `Вы зарегистрировались у нас больше недели назад, но так и не записались. Пора это исправить! 💃`;

      const msg = `👋 **${user.first_name}, скучаем по вам!**\n\n${msgText}\n\nПосмотрите расписание, там много интересного! 🩰`;

      await this.sendNotification(user.telegram_id, msg);

      // ─── Обновляем дату последнего напоминания ───────────────────────
      await this.supabaseService.getClient()
          .from('users')
          .update({ last_reminder_sent_at: now.toISOString() })
          .eq('telegram_id', user.telegram_id);
    }
  }

  async createDonateInvoiceLink(userId: number): Promise<string | null> {
    try {
      const payload: any = {
        title: 'Поддержка проекта ⭐',
        description: 'Поддержка на развитие платформы',
        payload: `donate_${userId}_${Date.now()}`,
        provider_token: '',
        currency: 'XTR',
        prices: [
          {
            label: 'Поддержка',
            amount: 100,
          },
        ],
      };

      const link = await this.bot.telegram.createInvoiceLink(payload as any);

      if (typeof link !== 'string' || !link.startsWith('https://t.me/')) {
        return null;
      }

      return link;
    } catch {
      return null;
    }
  }

  async broadcastMessage(message: string) {
    const { data: users, error } = await this.supabaseService.getClient()
        .from('users')
        .select('telegram_id');

    if (error || !users) {
      console.error('Failed to fetch users for broadcast', error);
      return;
    }

    for (const user of users) {
      try {
        await this.bot.telegram.sendMessage(user.telegram_id, message, { parse_mode: 'Markdown' });
      } catch (err) {
        console.error(`Failed to send message to ${user.telegram_id}`, err);
      }
    }
  }
}
