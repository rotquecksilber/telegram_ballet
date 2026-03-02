import { Module } from '@nestjs/common';
import { ClassesController } from './classes.controller';
import { ClassesService } from './classes.service';
import { SupabaseService } from '../supabase/supabase.service';

@Module({
  controllers: [ClassesController],
  providers: [ClassesService, SupabaseService],
  exports: [ClassesService],
})
export class ClassesModule {}
