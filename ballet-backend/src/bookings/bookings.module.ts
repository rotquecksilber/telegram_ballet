import { Module } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import {SupabaseService} from "../supabase/supabase.service";
import {SubscriptionsService} from "src/subscriptions/subscriptions.service";

@Module({
  controllers: [BookingsController],
  providers: [BookingsService, SupabaseService, SubscriptionsService],
})
export class BookingsModule {}
