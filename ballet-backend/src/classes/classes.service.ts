import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class ClassesService {
  constructor(private readonly supabaseService: SupabaseService) {}

  // Получить все названия занятий
  async findAll() {
    const { data, error } = await this.supabaseService.getClient()
        .from('classes')
        .select('*')
        .order('name', { ascending: true });

    if (error) throw new Error(error.message);
    return data;
  }

  // Добавить новое направление (например, "Пилатес")
  async create(name: string) {
    const { data, error } = await this.supabaseService.getClient()
        .from('classes')
        .insert([{ name }])
        .select()
        .single();

    if (error) throw new Error(error.message);
    return data;
  }

  // Удалить направление
  async remove(id: number) {
    const { error } = await this.supabaseService.getClient()
        .from('classes')
        .delete()
        .eq('id', id);

    if (error) throw new Error(error.message);
    return { success: true };
  }
}
