import { Module } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import {SupabaseService} from "../supabase/supabase.service";

@Module({

  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, SupabaseService],
})
export class SubscriptionsModule {}
