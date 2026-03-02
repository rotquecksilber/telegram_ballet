// schedule-templates.service.ts
import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class ScheduleTemplatesService {
  constructor(private readonly supabaseService: SupabaseService) {}

  private get client() {
    return this.supabaseService.getClient();
  }

  // Получить все шаблоны (с джоином названия класса)
  async findAll() {
    const { data, error } = await this.client
        .from('schedule_templates')
        .select('*, classes(name), users!teacher_id(first_name, last_name)')
        .order('time', { ascending: true });

    if (error) throw new Error(error.message);
    return data;
  }

  // Создать новый шаблон
  async create(dto: any) {
    const { data, error } = await this.client
        .from('schedule_templates')
        .insert(dto)
        .select();

    if (error) throw new Error(error.message);
    return data[0];
  }

  // Удалить шаблон
  async remove(id: number) {
    const { error } = await this.client
        .from('schedule_templates')
        .delete()
        .eq('id', id);

    if (error) throw new Error(error.message);
    return { success: true };
  }
}
