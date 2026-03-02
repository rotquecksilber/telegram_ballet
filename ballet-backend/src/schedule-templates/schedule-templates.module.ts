import { Module } from '@nestjs/common';
import { ScheduleTemplatesService } from './schedule-templates.service';
import { ScheduleTemplatesController } from './schedule-templates.controller';
import {SupabaseService} from "src/supabase/supabase.service";
import {ScheduleController} from "src/schedule/schedule.controller";
import {ScheduleService} from "src/schedule/schedule.service";

@Module({
  controllers: [ScheduleTemplatesController, ScheduleController],
  providers: [ScheduleTemplatesService, SupabaseService, ScheduleService],
})
export class ScheduleTemplatesModule {}
