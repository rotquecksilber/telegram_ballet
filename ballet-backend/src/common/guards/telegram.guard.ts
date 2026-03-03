import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';

@Injectable()
export class TelegramGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();

        // Мы ожидаем, что фронтенд присылает telegram_id в заголовках
        const telegramId = request.headers['x-telegram-id'];

        if (!telegramId) {
            throw new ForbiddenException('Доступ разрешен только через Telegram');
        }

        return true;
    }
}
