import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const originsEnv = process.env.ORIGINS;
  const allowedOrigins = originsEnv.split(',').map(o => o.trim()).filter(o => o !== '');

  app.enableCors({

    origin: allowedOrigins.length > 0 ? allowedOrigins : [/\.vercel\.app$/],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    allowedHeaders: 'Content-Type, Accept, Authorization',
  });

  const port = process.env.PORT || 3000;


  await app.listen(port, '0.0.0.0');

  logger.log(`Server started on port ${port}`);
  logger.log(`Allowed Origins: ${allowedOrigins.length > 0 ? allowedOrigins.join(', ') : 'Vercel Regex'}`);
}
bootstrap();
