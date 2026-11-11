import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: process.env.API_CORS_ORIGIN?.split(",") ?? ["http://localhost:3001", "http://localhost:3000"],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle("KeDo Smart V API")
    .setDescription("Business REST interface v1 (SVC / §12.1) — R0 scaffold")
    .setVersion("0.1.0")
    .addApiKey({ type: "apiKey", name: "x-kedov-user-id", in: "header" }, "demo-user")
    .addApiKey({ type: "apiKey", name: "x-kedov-org-id", in: "header" }, "demo-org")
    .addBearerAuth({ type: "http", scheme: "bearer", bearerFormat: "JWT" }, "oidc")
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("docs", app, document);

  const port = Number(process.env.API_PORT ?? 4000);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`KeDo API listening on http://localhost:${port} (OpenAPI /docs)`);
}

void bootstrap();
