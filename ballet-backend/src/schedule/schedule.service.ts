import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class ScheduleService {
  constructor(private readonly supabaseService: SupabaseService) {}

  // Получить всё расписание с "присоединенными" данными из других таблиц
  async findAll() {
    const { data, error } = await this.supabaseService.getClient()
        .from('schedule')
        .select(`
        *,
        classes (name),
        teacher:users!teacher_id (first_name, last_name)
      `)
        .order('date', { ascending: true })
        .order('time', { ascending: true });

    if (error) throw new Error(error.message);
    return data;
  }

  // Создать новое занятие
  async create(dto: any) {
    const { data, error } = await this.supabaseService.getClient()
        .from('schedule')
        .insert([{
          class_id: dto.class_id,
          teacher_id: dto.teacher_id,
          date: dto.date,
          time: dto.time,
          level: dto.level,
          age_category: dto.age_category,
            end_time: dto.end_time,
            status: 'active'
        }])
        .select();

    if (error) throw new Error(error.message);
    return data;
  }

  // Удалить занятие
  async remove(id: number) {
    const { error } = await this.supabaseService.getClient()
        .from('schedule')
        .delete()
        .eq('id', id);

    if (error) throw new Error(error.message);
    return { success: true };
  }

    async findActual() {
        const { data, error } = await this.supabaseService.getClient()
            .from('schedule')
            .select(`
      id,
      date,
      time,
      level,
      age_category,
      classes (name),
      status,
      end_time,
      teacher:users!teacher_id (
        first_name, 
        last_name
        
      )
    `)
            .order('date', { ascending: true })
            .order('time', { ascending: true });

        if (error) {
            console.error("Ошибка Supabase:", error);
            throw new Error(error.message);
        }
        return data;
    }
    async updateStatus(id: number, status: string) {
        const { data, error } = await this.supabaseService.getClient()
            .from('schedule')
            .update({ status })
            .eq('id', id)
            .select(); // Добавляем select, чтобы вернуть обновленный объект

        if (error) throw new Error(error.message);
        return data;
    }

    async update(id: number, dto: any) {
        const { data, error } = await this.supabaseService.getClient()
            .from('schedule')
            .update({
                class_id: dto.class_id,
                teacher_id: dto.teacher_id,
                date: dto.date,
                time: dto.time,
                level: dto.level,
                age_category: dto.age_category,
                end_time: dto.end_time,
            })
            .eq('id', id)
            .select();

        if (error) throw new Error(error.message);
        return data;
    }

    // В ScheduleService
    async deployTemplates(dayOfWeek: number, targetDate: string) {
        const client = this.supabaseService.getClient();

        // 1. Получаем шаблоны
        const { data: templates, error: fetchError } = await client
            .from('schedule_templates')
            .select('*')
            .eq('day_of_week', dayOfWeek);

        if (fetchError) throw new Error(fetchError.message);
        if (!templates || templates.length === 0) return { data: [], error: null };

        // 2. Маппинг в реальные занятия
        const newClasses = templates.map(t => ({
            class_id: t.class_id,
            teacher_id: t.teacher_id,
            date: targetDate,
            time: t.time,
            end_time: t.end_time,
            level: t.level,
            age_category: t.age_category,
            status: 'scheduled'
        }));

        // 3. Вставка (возвращаем результат, чтобы контроллер его видел)
        return client.from('schedule').insert(newClasses).select();
    }
}
