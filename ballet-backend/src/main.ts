import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

// Переносим инициализацию в переменную, чтобы Vercel мог её подхватить
let cachedServer: any;

async function bootstrap() {
  if (!cachedServer) {
    const app = await NestFactory.create(AppModule);

    // Тот самый CORS, который мы правили
    app.enableCors({
      origin: process.env.ALLOWED_ORIGINS || 'https://telegram-ballet.vercel.app',
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      credentials: true,
      allowedHeaders: 'Content-Type, Accept, Authorization',
    });

    await app.init();
    // Получаем экземпляр HTTP-сервера (Express под капотом)
    cachedServer = app.getHttpAdapter().getInstance();
  }
  return cachedServer;
}

// ЭКСПОРТ ДЛЯ VERCEL (Критически важно!)
export default async (req: any, res: any) => {
  const server = await bootstrap();
  return server(req, res);
};
