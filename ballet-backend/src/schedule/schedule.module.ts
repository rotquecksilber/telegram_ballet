import { Module } from '@nestjs/common';
import { ScheduleController } from './schedule.controller';
import { ScheduleService } from './schedule.service';
import { SupabaseService } from '../supabase/supabase.service';

@Module({
  controllers: [ScheduleController],
  providers: [ScheduleService, SupabaseService],
})
export class ScheduleModule {}
