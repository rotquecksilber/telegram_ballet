import { Module } from '@nestjs/common';
import { ScheduleTemplatesService } from './schedule-templates.service';
import { ScheduleTemplatesController } from './schedule-templates.controller';
import {SupabaseService} from "../supabase/supabase.service";
import {ScheduleController} from "../schedule/schedule.controller";
import {ScheduleService} from "../schedule/schedule.service";

@Module({
  controllers: [ScheduleTemplatesController, ScheduleController],
  providers: [ScheduleTemplatesService, SupabaseService, ScheduleService],
})
export class ScheduleTemplatesModule {}
