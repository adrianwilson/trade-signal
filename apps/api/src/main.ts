import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  app.enableCors({
    origin: process.env['CORS_ORIGIN'] || 'http://localhost:4200',
  });

  if (process.env['NODE_ENV'] === 'production') {
    const staticPath = join(process.cwd(), 'dist', 'dashboard', 'browser');
    app.useStaticAssets(staticPath);

    // SPA fallback: serve index.html for non-API routes
    const express = app.getHttpAdapter().getInstance();
    express.get(/^\/(?!api).*/, (_req, res) => {
      res.sendFile(join(staticPath, 'index.html'));
    });
  }

  const port = process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`,
  );
}

bootstrap();
