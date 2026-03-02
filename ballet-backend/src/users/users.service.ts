import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
    constructor(private readonly supabaseService: SupabaseService) {
    }

    async createOrUpdateUser(dto: CreateUserDto) {
        const client = this.supabaseService.getClient();

        // 1. Проверяем, есть ли ID пользователя в списке админов
        const {data: adminRecord} = await client
            .from('admins')
            .select('id')
            .eq('id', dto.telegram_id)
            .maybeSingle();

        // Определяем статус админа: true, если нашли запись в таблице admins
        const isAdminStatus = !!adminRecord;

        // 2. Сохраняем или обновляем пользователя в таблице users
        const {data, error} = await client
            .from('users')
            .upsert({
                telegram_id: dto.telegram_id,
                username: dto.username,
                first_name: dto.first_name,
                last_name: dto.last_name,
                phone: dto.phone,
                is_admin: isAdminStatus, // Присваиваем статус на основе проверки выше
            })
            .select()
            .single();

        if (error) {
            throw new Error(`Ошибка Supabase: ${error.message}`);
        }

        return data;
    }

    async getUserByTelegramId(telegram_id: number) {
        const client = this.supabaseService.getClient();
        const { data, error } = await client
            .from('users')
            .select('*')
            .eq('telegram_id', telegram_id)
            .maybeSingle();

        if (error) throw new Error(error.message);
        return data;
    }

    // Получить всех пользователей для админки
    async findAll() {
        const { data, error } = await this.supabaseService.getClient()
            .from('users')
            .select('*');
        return data;
    }

// Получить только учителей
    async findTeachers() {
        const { data, error } = await this.supabaseService.getClient()
            .from('users')
            .select('*')
            .eq('is_teacher', true);
        return data;
    }

    async updateTeacherStatus(id: string, status: boolean) { // id теперь string
        const { data, error } = await this.supabaseService.getClient()
            .from('users')
            .update({ is_teacher: status })
            .eq('id', id) // Supabase сам поймет, что это UUID
            .select();

        if (error) throw new Error(error.message);
        return data;
    }
    // В NestJS сервисе пользователей (UsersService)
    async findAllWithSubscriptions() {
        const client = this.supabaseService.getClient();
        const { data, error } = await client
            .from('users')
            .select(`
      *,
      subscriptions (
        id,
        status,
        remaining_lessons,
        expiry_date,
        is_frozen,
        freeze_start_date,
        freeze_limit_days,
        freeze_days_used
      )
    `)
            .order('last_name', { ascending: true });

        if (error) throw new Error(error.message);
        return data;
    }

}
