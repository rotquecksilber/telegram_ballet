import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import * as express from 'express';

let cachedServer: any;

async function bootstrap() {
  if (!cachedServer) {
    const expressApp = express();

    const app = await NestFactory.create(
        AppModule,
        new ExpressAdapter(expressApp),
    );

    app.setGlobalPrefix('api');

    const originsEnv = process.env.ALLOWED_ORIGINS;
    const originPolicy = originsEnv
        ? originsEnv.split(',').map(o => o.trim())
        : ['https://telegram-ballet.vercel.app'];

    app.enableCors({
      origin: originPolicy,
      credentials: true,
    });

    await app.init();

    cachedServer = expressApp;
  }

  return cachedServer;
}

export default async function handler(req: any, res: any) {
  const server = await bootstrap();
  return server(req, res);
}
