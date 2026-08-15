import { Module } from '@nestjs/common';
import { StatsService } from './stats.service';
import { StatsController } from './stats.controller';
import { SupabaseService } from '../supabase/supabase.service';

@Module({
  controllers: [StatsController],
  providers: [StatsService, SupabaseService],
})
export class StatsModule {}
