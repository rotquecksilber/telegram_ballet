import {AppModule} from "./app.module";
import {NestFactory} from "@nestjs/core";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Включаем CORS
  app.enableCors({
    origin: '*', // На время разработки можно так, позже укажешь адрес фронта
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  await app.listen(3000);
}
bootstrap();
