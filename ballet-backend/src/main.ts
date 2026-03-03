import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import * as express from 'express';
import { Logger } from '@nestjs/common';

// Кэшируем сервер для Serverless-среды Vercel
let cachedServer: any;

async function bootstrap() {
  if (!cachedServer) {
    const expressApp = express();
    const app = await NestFactory.create(
        AppModule,
        new ExpressAdapter(expressApp),
    );

    const logger = new Logger('Bootstrap');

    // 1. Глобальный префикс (обязательно для верного роутинга через vercel.json)
    app.setGlobalPrefix('api');

    // 2. Настройка CORS
    const originsEnv = process.env.ALLOWED_ORIGINS;
    const originPolicy = originsEnv ? originsEnv : 'https://telegram-ballet.vercel.app';

    app.enableCors({
      origin: originPolicy,
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      credentials: true,
      allowedHeaders: 'Content-Type, Accept, Authorization',
    });

    // 3. Инициализация (без app.listen!)
    await app.init();

    cachedServer = expressApp;
    logger.log(`Nest application initialized with prefix /api`);
    logger.log(`CORS allowed for: ${originPolicy}`);
  }
  return cachedServer;
}

// Экспорт для Vercel
export default async (req: any, res: any) => {
  const server = await bootstrap();
  return server(req, res);
}
