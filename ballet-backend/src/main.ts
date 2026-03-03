import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);


  const allowedOrigin = process.env.ALLOWED_ORIGINS || 'https://telegram-ballet.vercel.app';

  app.enableCors({
    origin: allowedOrigin,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    allowedHeaders: 'Content-Type, Accept, Authorization',
  });

  // Порт для продакшена
  const port = process.env.PORT || 3000;

  // 0.0.0.0 — критично для деплоя (Render, Railway и др.)
  await app.listen(port, '0.0.0.0');

  logger.log(`CORS allowed for: ${allowedOrigin}`);
  logger.log(`Server is listening on port ${port}`);
}
bootstrap();
