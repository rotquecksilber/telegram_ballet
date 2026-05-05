import { AppModule } from "./app.module";
import { NestFactory } from "@nestjs/core";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: [
      'https://telegram-ballet.vercel.app',
      'https://conjectural-unconcealingly-edmund.ngrok-free.dev'
    ],
    credentials: true,
  });

  await app.listen(3000);
}

bootstrap();
