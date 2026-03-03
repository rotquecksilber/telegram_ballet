import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
//import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  //app.use(helmet());

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));



  app.enableCors({
    origin: true, // Разрешает любой origin, который прислал запрос
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    allowedHeaders: 'Content-Type,Accept,Authorization,x-telegram-id',
  });

  // Порт и хост для деплоя
  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');

}
bootstrap();
