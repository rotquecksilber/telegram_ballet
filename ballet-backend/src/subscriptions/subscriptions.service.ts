import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import {TelegramService} from "src/telegram/telegram.service";

@Injectable()
export class SubscriptionsService {
  constructor(private readonly supabaseService: SupabaseService,
              private readonly telegramService: TelegramService,) {
  }

  private get client() {
    return this.supabaseService.getClient();
  }

  async create(dto: CreateSubscriptionDto) {
    const { data, error } = await this.client
        .from('subscriptions')
        .insert({
          user_id: dto.user_id,
          total_lessons: dto.total_lessons,
          remaining_lessons: dto.remaining_lessons,
          purchase_date: dto.purchase_date,
          // Сохраняем длительность, переданную с фронтенда
          duration_days: dto.duration_days,
          // Можно передать dto.expiry_date как "плановый",
          // но он перезапишется методом spendLesson при первом посещении
          expiry_date: dto.expiry_date,
          freeze_limit_days: dto.freeze_limit_days || 0,
          status: dto.status || 'active',
          // Убеждаемся, что при создании активация пустая
          activation_date: null
        })
        .select()
        .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async toggleFreeze(id: number, is_frozen: boolean) {
    const {data: sub} = await this.client
        .from('subscriptions')
        .select('*')
        .eq('id', id)
        .single();

    let updateData: any = {is_frozen};

    if (is_frozen) {
      // Устанавливаем дату начала заморозки (сегодня)
      updateData.freeze_start_date = new Date().toISOString().split('T')[0];
      updateData.status = 'frozen';
    } else {
      // РАЗМОРОЗКА
      // Проверка: если даты начала нет, мы не можем посчитать дни
      if (!sub.freeze_start_date) {
        updateData.status = 'active';
        updateData.freeze_start_date = null;
      } else {
        const start = new Date(sub.freeze_start_date);
        const now = new Date();

        // Считаем разницу в днях
        const diffTime = Math.abs(now.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Сдвигаем expiry_date
        const currentExpiry = new Date(sub.expiry_date);
        currentExpiry.setDate(currentExpiry.getDate() + diffDays);

        updateData.expiry_date = currentExpiry.toISOString().split('T')[0];
        updateData.freeze_start_date = null; // Очищаем после разморозки
        updateData.status = 'active';
        updateData.freeze_days_used = (sub.freeze_days_used || 0) + diffDays;
      }
    }

    const {data, error} = await this.client
        .from('subscriptions')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

    if (error) throw new Error(error.message);
    return data;
  }

  // Метод для уменьшения кол-ва занятий (когда ученик пришел на урок)
  async spendLesson(id: number, lessonName: string) {
    // 1️⃣ Получаем данные абонемента
    const { data: sub, error: fetchError } = await this.client
        .from('subscriptions')
        .select('*')
        .eq('id', id)
        .single();

    if (fetchError || !sub) throw new Error('Абонемент не найден');

    // 2️⃣ Вычисляем новое количество занятий
    const newCount = sub.remaining_lessons - 1;
    const status = newCount <= 0 ? 'exhausted' : 'active';

    let updateData: any = {
      remaining_lessons: newCount,
      status
    };

    // 3️⃣ Логика активации (если это первое списание)
    if (!sub.activation_date) {
      const today = new Date();
      const daysToExpiration = sub.duration_days || 30;

      const expiryDate = new Date(today);
      expiryDate.setDate(expiryDate.getDate() + daysToExpiration);

      updateData.activation_date = today.toISOString().split('T')[0];
      updateData.expiry_date = expiryDate.toISOString().split('T')[0];
    }

    // 4️⃣ Обновляем абонемент
    const { data: updated, error } = await this.client
        .from('subscriptions')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

    if (error) throw new Error(error.message);

    // 5️⃣ Отправляем уведомление пользователю
    await this.notifyLessonDebited(sub.user_id, updated, lessonName, false);

    return updated;
  }

  async findActiveByTelegramId(telegram_id: number) {
    const {data, error} = await this.client
        .from('subscriptions')
        .select('*')
        .eq('user_id', telegram_id)
        // Убираем жесткий фильтр только по active, добавляем frozen
        .in('status', ['active', 'frozen'])
        .order('id', {ascending: false});

    if (error) throw new Error(`Ошибка базы данных: ${error.message}`);
    return data || [];
  }

  async forceSpendLessons(id: number, count: number, lessonName: string) {
    const { data: sub, error } = await this.client
        .from('subscriptions')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !sub) throw new Error('Абонемент не найден');
    if (count <= 0) throw new Error('Некорректное количество');

    const newCount = Math.max(sub.remaining_lessons - count, 0);
    const status = newCount <= 0 ? 'exhausted' : sub.status;

    const { data: updated, error: updateError } = await this.client
        .from('subscriptions')
        .update({
          remaining_lessons: newCount,
          status
        })
        .eq('id', id)
        .select()
        .single();

    if (updateError) throw new Error(updateError.message);

    // ⚠️ Отправляем уведомление о принудительном списании
    await this.notifyLessonDebited(sub.user_id, updated, lessonName, true);

    return updated;
  }


  async notifyLessonDebited(user_id: number, subscription: any, lessonName: string, forced = false) {
    try {
      const remaining = subscription.remaining_lessons;
      let message = `✅ Занятие **${lessonName}** списано.\n` +
          `📊 Осталось занятий: ${remaining}`;

      if (forced) {
        message += `\n\n⚠️ Это принудительное списание. По всем вопросам пишите @Yuliya_Bacheva`;
      }

      if (remaining === 1) {
        message += `\n💡 Напоминаем оплатить следующий абонемент заранее`;
      }

      await this.telegramService.sendNotification(user_id, message);

    } catch (err) {
      console.error(`Ошибка уведомления в Telegram для ${user_id}: ${err.message}`);
    }
  }
}
