import { Module, Global } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { BotUpdate } from './bot.update';
import { SupabaseService } from '../supabase/supabase.service';
import {ConfigModule} from "@nestjs/config"; // Импортируй свой модуль базы

@Global()
@Module({
  imports: [ConfigModule],
  providers: [TelegramService, BotUpdate, SupabaseService],
  exports: [TelegramService, SupabaseService], // 2. Экспортируем ТОЛЬКО TelegramService
})
export class TelegramModule {}
