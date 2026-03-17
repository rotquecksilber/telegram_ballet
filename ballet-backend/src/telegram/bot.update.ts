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
1. Сначала зарегистрируйтесь во вкладке **"Профиль"**.
2. Нажмите кнопку **"Расписание"**.
3. Выберите подходящее направление и время.
4. Нажмите **"Записаться"**.
5. В разделе **"Профиль"** вы можете проверить свои бронирования или отменить их.

**Важно:**
- Отменить занятие можно не позднее чем за 3 часа до начала.
- Запись на занятие закрывается за 1 час до начала.
- Уведомления о записи придут сюда.
- Если вам понравится сервис, вы можете поддержать его разработку донатом во вкладке **"Профиль"** 💛

По любым вопросам, замечаниям или предложениям вы можете написать в Telegram: @rotquecksilber 💬

Будем рады видеть вас на классах!
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
