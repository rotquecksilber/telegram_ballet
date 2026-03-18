import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { TelegramService } from '../telegram/telegram.service';

@Injectable()
export class SubscriptionsService {
  constructor(
      private readonly supabaseService: SupabaseService,
      private readonly telegramService: TelegramService
  ) {}

  private get client() {
    return this.supabaseService.getClient();
  }

  // ================= СОЗДАНИЕ =================
  async create(dto: CreateSubscriptionDto) {
    const { data, error } = await this.client
        .from('subscriptions')
        .insert({
          user_id: dto.user_id,
          total_lessons: dto.total_lessons,
          remaining_lessons: dto.remaining_lessons,
          purchase_date: dto.purchase_date,
          duration_days: dto.duration_days,
          expiry_date: dto.expiry_date,
          freeze_limit_days: dto.freeze_limit_days || 0,
          status: dto.status || 'active',
          activation_date: null
        })
        .select()
        .single();

    if (error) throw new Error(error.message);

    // 📩 Уведомление о выдаче абонемента
    try {
      await this.notifySubscriptionIssued(data.user_id, data);
    } catch (e) {
      console.error('Ошибка отправки уведомления:', e);
    }

    return data;
  }

  // ================= ЗАМОРОЗКА =================
  async toggleFreeze(id: number, is_frozen: boolean) {
    const { data: sub } = await this.client
        .from('subscriptions')
        .select('*')
        .eq('id', id)
        .single();

    let updateData: any = { is_frozen };

    if (is_frozen) {
      updateData.freeze_start_date = new Date().toISOString().split('T')[0];
      updateData.status = 'frozen';
    } else {
      if (!sub.freeze_start_date) {
        updateData.status = 'active';
        updateData.freeze_start_date = null;
      } else {
        const start = new Date(sub.freeze_start_date);
        const now = new Date();
        const diffDays = Math.ceil(Math.abs(now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

        const currentExpiry = new Date(sub.expiry_date);
        currentExpiry.setDate(currentExpiry.getDate() + diffDays);

        updateData.expiry_date = currentExpiry.toISOString().split('T')[0];
        updateData.freeze_start_date = null;
        updateData.status = 'active';
        updateData.freeze_days_used = (sub.freeze_days_used || 0) + diffDays;
      }
    }

    const { data, error } = await this.client
        .from('subscriptions')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

    if (error) throw new Error(error.message);
    return data;
  }

  // ================= ОБЫЧНОЕ СПИСАНИЕ =================
  async spendLesson(id: number) {
    const { data: sub, error: fetchError } = await this.client
        .from('subscriptions')
        .select('*')
        .eq('id', id)
        .single();

    if (fetchError || !sub) throw new Error('Абонемент не найден');

    const newCount = sub.remaining_lessons - 1;
    const status = newCount <= 0 ? 'exhausted' : 'active';

    let updateData: any = { remaining_lessons: newCount, status };

    if (!sub.activation_date) {
      const today = new Date();
      const expiryDate = new Date(today);
      expiryDate.setDate(expiryDate.getDate() + (sub.duration_days || 30));

      updateData.activation_date = today.toISOString().split('T')[0];
      updateData.expiry_date = expiryDate.toISOString().split('T')[0];
    }

    const { data, error } = await this.client
        .from('subscriptions')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

    if (error) throw new Error(error.message);

    await this.notifyLessonDebited(sub.user_id, data, false);

    return data;
  }

  // ================= ПРИНУДИТЕЛЬНОЕ СПИСАНИЕ =================
  async forceSpendLessons(id: number, count: number) {
    const { data: sub, error } = await this.client
        .from('subscriptions')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !sub) throw new Error('Абонемент не найден');
    if (count <= 0) throw new Error('Некорректное количество');

    const newCount = Math.max(sub.remaining_lessons - count, 0);
    const status = newCount <= 0 ? 'exhausted' : sub.status;

    const { data, error: updateError } = await this.client
        .from('subscriptions')
        .update({ remaining_lessons: newCount, status })
        .eq('id', id)
        .select()
        .single();

    if (updateError) throw new Error(updateError.message);

    await this.notifyLessonDebited(sub.user_id, data, true);

    return data;
  }

  // ================= АКТИВНЫЕ АБОНЕМЕНТЫ =================
  async findActiveByTelegramId(telegram_id: number) {
    const { data, error } = await this.client
        .from('subscriptions')
        .select('*')
        .eq('user_id', telegram_id)
        .in('status', ['active', 'frozen'])
        .order('id', { ascending: false });

    if (error) throw new Error(`Ошибка БД: ${error.message}`);
    return data || [];
  }

  // ================= УВЕДОМЛЕНИЯ =================
  async notifyLessonDebited(user_id: number, subscription: any, forced = false) {
    try {
      const remaining = Number(subscription.remaining_lessons);
      let message = `✅ Занятие списано с абонемента.\n📊 Осталось занятий: ${remaining}`;

      if (forced === true) {
        message += `\n\n⚠️ Это принудительное списание. По всем вопросам пишите @Yuliya_Bacheva`;
      }

      if (remaining === 1) {
        message += `\n💡 Напоминаем оплатить следующий абонемент заранее`;
      }

      if (remaining === 0) {
        message += `\n❌ Абонемент завершён`;
      }

      await this.telegramService.sendNotification(user_id, message);
    } catch (err) {
      console.error(`Ошибка уведомления Telegram для ${user_id}: ${err.message}`);
    }
  }

  async notifySubscriptionIssued(user_id: number, subscription: any) {
    try {
      const total = Number(subscription.total_lessons);
      let message = `🎉 Вам выдан новый абонемент!\n📚 Количество занятий: ${total}`;

      if (!subscription.activation_date) {
        message += `\n⏳ Срок начнёт отсчитываться с первого занятия`;
      }

      if (subscription.expiry_date) {
        message += `\n📅 Действует до: ${subscription.expiry_date}`;
      }

      message += `\n\n💬 По всем вопросам пишите @Yuliya_Bacheva`;

      await this.telegramService.sendNotification(user_id, message);
    } catch (err) {
      console.error(`Ошибка уведомления о выдаче абонемента для ${user_id}: ${err.message}`);
    }
  }
}
