import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { SwaggerSetting } from "./config/swagger/swagger";

import { ValidationPipe, Logger } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import * as bodyParser from "body-parser";
import * as express from "express";
import { join } from "path";

async function bootstrap() {
  const logger = new Logger("Bootstrap");

  try {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);

    // Raw body parser for Stripe webhook BEFORE JSON parser
    app.use("/stripe/webhook", bodyParser.raw({ type: "application/json" }));

    // Static folders
    const publicDir = join(process.cwd(), "public");
    const uploadDir = join(process.cwd(), "uploads");

    app.use("/", express.static(publicDir));
    app.use("/uploads", express.static(uploadDir));

    // Then global JSON parser for everything else
    app.use(bodyParser.json());

    // Enable CORS
    app.enableCors({
      origin: "*",
      methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
      credentials: true,
    });

    // Swagger
    SwaggerSetting(app);

    // Global validation
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        disableErrorMessages: false,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    const port = process.env.PORT ?? 3003;
    await app.listen(port);
    console.log(`✔ Swagger docs: http://localhost:${port}/doc`);
  } catch (error) {
    logger.error("Failed to start application:", error);
    process.exit(1);
  }
}
void bootstrap();
