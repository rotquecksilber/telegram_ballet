import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { SupabaseService } from '../supabase/supabase.service'; // Путь до твоего сервиса



@Module({

    controllers: [UsersController],
    providers: [UsersService, SupabaseService], // Добавляем оба сервиса сюда
})
export class UsersModule {}
