import {Controller, Post, Body, Patch, Param, Get} from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post()
  create(@Body() dto: CreateSubscriptionDto) {
    return this.subscriptionsService.create(dto);
  }

  @Patch(':id/freeze')
  toggleFreeze(@Param('id') id: string, @Body('is_frozen') is_frozen: boolean) {
    return this.subscriptionsService.toggleFreeze(+id, is_frozen);
  }

  @Patch(':id/spend')
  spend(@Param('id') id: string) {
    return this.subscriptionsService.spendLesson(+id);
  }

  @Get('user/:telegram_id')
  async getByUserId(@Param('telegram_id') telegram_id: string) {
    return this.subscriptionsService.findActiveByTelegramId(Number(telegram_id));
  }
}
