import { Module } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import {SupabaseService} from "../supabase/supabase.service";

@Module({
  controllers: [BookingsController],
  providers: [BookingsService, SupabaseService],
})
export class BookingsModule {}
