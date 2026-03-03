import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import {UsersModule} from "./users/users.module";
import {ConfigModule, ConfigService} from "@nestjs/config";
import { ScheduleModule } from './schedule/schedule.module';
import { ClassesModule } from './classes/classes.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { BookingsModule } from './bookings/bookings.module';
import { ScheduleTemplatesModule } from './schedule-templates/schedule-templates.module';
import {TelegrafModule} from "nestjs-telegraf";
import {BotUpdate} from "./telegram/bot.update";
import { TelegramModule } from './telegram/telegram.module';
import {SupabaseService} from "./supabase/supabase.service";
import { CronController } from './cron/cron.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // 2. Затем асинхронно инициализируем бота
    TelegrafModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        token: configService.get<string>('TELEGRAM_BOT_TOKEN'),
      }),
      inject: [ConfigService],
    }),// Это подтянет .env во всё приложение
    UsersModule, ScheduleModule, ClassesModule, SubscriptionsModule, BookingsModule, ScheduleTemplatesModule, TelegramModule,
  ],
  controllers: [AppController, CronController],
  providers: [AppService, BotUpdate, SupabaseService],

})
export class AppModule {}
