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

      // Здесь можно записать донат в базу
      // const userId = payment.invoice_payload.split('_')[1];
      // await this.supabaseService.addDonation(userId, payment.total_amount);

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

    const { data: users, error: userError } = await this.supabaseService.getClient()
        .from('users')
        .select('telegram_id, first_name, created_at');

    if (userError || !users) return;

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
}
