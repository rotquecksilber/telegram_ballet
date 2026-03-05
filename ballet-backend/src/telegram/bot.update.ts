import { Update, Start, Ctx } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import {ConfigService} from "@nestjs/config";

@Update()
export class BotUpdate {
    constructor(private readonly configService: ConfigService) {}
    @Start()
    async onStart(@Ctx() ctx: Context) {
        const welcomeMessage = `
Привет, ${ctx.from?.first_name}! 🩰 

Добро пожаловать в систему записи на занятия нашей балетной школы.

**Как пользоваться ботом:**
1. Нажми кнопку **"Открыть расписание"** в меню.
2. Выбери подходящее направление и время.
3. Нажми **"Записаться"**.
4. В разделе **"Профиль"** ты можешь проверить свои бронирования или отменить их.

**Важно:**
- Уведомления о записи придут сюда.

Будем рады видеть тебя на классах!
    `;

        await ctx.reply(welcomeMessage, {
            parse_mode: 'Markdown',
            // Можно сразу добавить кнопку открытия WebApp, если хочешь
            reply_markup: {
                inline_keyboard: [
                    [{ text: "🩰 Открыть расписание", web_app: { url:'https://telegram-ballet.vercel.app' } }]
                ]
            }
        });
    }
}
