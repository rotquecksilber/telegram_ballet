import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import {TelegramService} from "src/telegram/telegram.service";

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(private readonly supabase: SupabaseService,
              private readonly telegramService: TelegramService,) {}

  /**
   * 1. Создание записи (поддерживает null в subscription_id)
   */
  /**
   * 1. Создание записи (поддерживает null в subscription_id)
   */
  async create(dto: { user_id: number; schedule_id: number; subscription_id?: number }) {
    const client = this.supabase.getClient();
    const targetId = Number(dto.schedule_id);

    this.logger.log(`Попытка записи: user=${dto.user_id}, schedule=${targetId}`);

    // Ищем занятие и СРАЗУ подтягиваем название из связанной таблицы classes
    // Важно: classes:class_id(name) работает, если в БД есть Foreign Key
    const { data: lesson, error: lessonError } = await client
        .from('schedule')
        .select(`
          date, 
          time, 
          classes:class_id (name)
        `)
        .eq('id', targetId)
        .single();

    if (lessonError || !lesson) {
      throw new NotFoundException(`Занятие с ID ${targetId} не найдено`);
    }

    // Проверка времени: не позже чем за 15 мин
    const lessonTime = this.getLessonDateTime(lesson.date, lesson.time);
    const diffMinutes = (lessonTime.getTime() - Date.now()) / 60000;

    if (diffMinutes < 15) {
      throw new BadRequestException('Запись закрыта (до начала менее 15 минут)');
    }

    // Проверка на дубликат (не даем записаться, если статус confirmed или attended)
    const { data: existing } = await client
        .from('bookings')
        .select('id')
        .eq('user_id', dto.user_id)
        .eq('schedule_id', targetId)
        .in('status', ['confirmed', 'attended'])
        .maybeSingle();

    if (existing) {
      throw new BadRequestException('Вы уже записаны на это занятие');
    }

    // Создаем бронь. subscription_id теперь опционален
    const { data, error } = await client
        .from('bookings')
        .insert([{
          user_id: dto.user_id,
          schedule_id: targetId,
          subscription_id: dto.subscription_id || null,
          status: 'confirmed',
          is_debited: false
        }])
        .select()
        .single();

    if (error) throw new Error(`Ошибка БД: ${error.message}`);

    // --- БЛОК УВЕДОМЛЕНИЯ В ТЕЛЕГРАМ ---
    try {
      const dateFormatted = new Date(lesson.date).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        weekday: 'short'
      });
      const timeFormatted = lesson.time.slice(0, 5);

      // Извлекаем название класса из вложенного объекта, который мы получили в select
      const className = (lesson as any).classes?.name || 'Занятие';

      const message =
          `✅ **Запись подтверждена!**\n\n` +
          `🩰 Занятие: **${className}**\n` +
          `📅 Дата: ${dateFormatted}\n` +
          `⏰ Время: ${timeFormatted}\n\n` +
          `Ждем вас в зале! ✨`;

      // Отправляем сообщение пользователю
      await this.telegramService.sendNotification(dto.user_id, message);

    } catch (err) {
      // Логируем ошибку, но не прерываем выполнение (запись в БД-то создана успешно)
      this.logger.error(`Не удалось отправить сообщение в TG: ${err.message}`);
    }

    return data;
  }

  /**
   * 2. Отмена записи (учеником)
   */
  async cancel(bookingId: number) {
    const client = this.supabase.getClient();
    const { data: b, error } = await client
        .from('bookings')
        .select('*, schedule:schedule_id(date, time)')
        .eq('id', bookingId)
        .single();

    if (error || !b) throw new NotFoundException('Запись не найдена');

    const lessonTime = this.getLessonDateTime(b.schedule.date, b.schedule.time);
    const diffHours = (lessonTime.getTime() - Date.now()) / (1000 * 60 * 60);

    // Если меньше часа до занятия — поздняя отмена
    const newStatus = diffHours >= 1 ? 'cancelled' : 'late_cancelled';

    const { data, error: upError } = await client
        .from('bookings')
        .update({ status: newStatus })
        .eq('id', bookingId)
        .select()
        .single();

    if (upError) throw new Error(upError.message);

    return {
      message: diffHours >= 1 ? 'Успешно отменено' : 'Поздняя отмена (списание занятия)',
      data
    };
  }

  /**
   * 3. Отметка посещения и списание (для админа)
   */
  /**
   * Списание занятия (максимально надежная версия)
   */
  async debitLesson(bookingId: number) {
    const client = this.supabase.getClient();

    // 1. Получаем инфо о записи и пользователе с его абонементами
    const { data: booking, error: fetchErr } = await client
        .from('bookings')
        .select(`
          *,
          user:user_id (
            id,
            subscriptions (id, remaining_lessons)
          )
        `)
        .eq('id', bookingId)
        .single();

    if (!booking) throw new NotFoundException('Запись не найдена');
    if (booking.is_debited) throw new BadRequestException('Занятие уже было списано ранее');

    let targetSubId = booking.subscription_id;
    let currentRemaining = 0;

    // 2. ЛОГИКА ПОДБОРА АБОНЕМЕНТА:
    // Если в самой записи sub_id нет, ищем первый попавшийся активный абонемент у юзера
    if (!targetSubId) {
      const activeSub = booking.user?.subscriptions?.find(s => s.remaining_lessons > 0);
      if (activeSub) {
        targetSubId = activeSub.id;
        currentRemaining = activeSub.remaining_lessons;
      }
    } else {
      // Если sub_id в записи был, находим его остаток
      const sub = booking.user?.subscriptions?.find(s => s.id === targetSubId);
      currentRemaining = sub?.remaining_lessons || 0;
    }

    // 3. СПИСАНИЕ (если нашли какой-то абонемент)
    if (targetSubId) {
      const { error: subError } = await client
          .from('subscriptions')
          .update({ remaining_lessons: currentRemaining - 1 })
          .eq('id', targetSubId);

      if (subError) {
        this.logger.error(`Ошибка списания с абонемента ${targetSubId}: ${subError.message}`);
        throw new Error('Не удалось обновить счетчик в абонементе');
      }
    }

    // 4. ОБНОВЛЯЕМ СТАТУС ЗАПИСИ
    // Даже если абонемента не было (оплата наличными), помечаем как списано
    const { data, error: bookError } = await client
        .from('bookings')
        .update({
          is_debited: true,
          status: 'attended',
          subscription_id: targetSubId // Сохраняем связь, если подобрали абонемент сейчас
        })
        .eq('id', bookingId)
        .select()
        .single();

    if (bookError) throw new Error(`Ошибка обновления статуса записи: ${bookError.message}`);

    return data;
  }

  /**
   * 4. История пользователя (с мапингом данных для фронта)
   */
  async findAllByUser(userId: number) {
    const { data, error } = await this.supabase.getClient()
        .from('bookings')
        .select(`
        *,
        schedule:schedule_id (
          id, date, time, level,
          classes:class_id (name)
        )
      `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data;
  }

  /**
   * 5. Список записавшихся (для админа - по уроку)
   */
  async findBySchedule(scheduleId: number) {
    const { data, error } = await this.supabase.getClient()
        .from('bookings')
        .select('*, user:user_id(first_name, last_name, phone)')
        .eq('schedule_id', scheduleId)
        .neq('status', 'cancelled'); // Не показываем тех, кто отменился вовремя

    if (error) throw new Error(error.message);
    return data;
  }

  /**
   * 6. Поиск всех записей на конкретную дату (для Журнала админа)
   */
// bookings.service.ts -> findByDate
  async findByDate(date: string) {
    const { data, error } = await this.supabase.getClient()
        .from('bookings')
        .select(`
        *,
        user:user_id(
          id,
          first_name, 
          last_name, 
          phone,
          subscriptions(id)
        ),
        schedule!inner(id, date, time, classes:class_id(name))
      `)
        .eq('schedule.date', date)
        .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data;
  }

  /**
   * 7. Удаление записи
   */
  async remove(id: number) {
    const { error } = await this.supabase.getClient()
        .from('bookings')
        .delete()
        .eq('id', id);

    if (error) throw new Error(error.message);
    return { success: true };
  }

  async setAttendance(bookingId: string, status: boolean | null) {
    const client = this.supabase.getClient();

    this.logger.log(`Обновление посещаемости: ID=${bookingId}, value=${status}`);

    const { data, error } = await client
        .from('bookings')
        .update({
          is_attended: status // Просто пишем значение как есть (null/true/false)
        })
        .eq('id', bookingId)
        .select()
        .single();

    if (error) {
      this.logger.error(`Ошибка Supabase: ${error.message}`);
      throw new BadRequestException(`Ошибка обновления: ${error.message}`);
    }

    if (!data) {
      throw new NotFoundException('Запись не найдена');
    }

    return data;
  }

  /**
   * Вспомогательный метод парсинга времени
   */
  private getLessonDateTime(dateStr: string, timeStr: string): Date {
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hours, minutes] = timeStr.split(':').map(Number);
    return new Date(year, month - 1, day, hours, minutes, 0);
  }
}
