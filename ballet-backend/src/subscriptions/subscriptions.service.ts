import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly supabaseService: SupabaseService) {
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
  async spendLesson(id: number) {
    // 1. Получаем полные данные абонемента
    const { data: sub, error: fetchError } = await this.client
        .from('subscriptions')
        .select('*')
        .eq('id', id)
        .single();

    if (fetchError || !sub) throw new Error('Абонемент не найден');

    const newCount = sub.remaining_lessons - 1;
    const status = newCount <= 0 ? 'exhausted' : 'active';

    let updateData: any = {
      remaining_lessons: newCount,
      status
    };

    // 2. ЛОГИКА АКТИВАЦИИ: если это самое первое списание
    if (!sub.activation_date) {
      const today = new Date();

      // Берем длительность из БД (которую прислал фронт при создании)
      // Если вдруг там пусто, ставим 30 по умолчанию
      const daysToExpiration = sub.duration_days || 30;

      const expiryDate = new Date(today);
      expiryDate.setDate(expiryDate.getDate() + daysToExpiration);

      updateData.activation_date = today.toISOString().split('T')[0];
      updateData.expiry_date = expiryDate.toISOString().split('T')[0];

      console.log(`Абонемент ${id} активирован сегодня. Годен до: ${updateData.expiry_date}`);
    }

    // 3. Обновляем запись в Supabase
    const { data, error } = await this.client
        .from('subscriptions')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

    if (error) throw new Error(error.message);
    return data;
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
}
