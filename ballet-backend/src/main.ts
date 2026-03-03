import { AppModule } from "./app.module";
import { NestFactory } from "@nestjs/core";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: 'https://telegram-ballet.vercel.app',
    credentials: true,
  });

  await app.listen(3000);
}

bootstrap();
