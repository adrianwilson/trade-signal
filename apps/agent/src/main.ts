import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AgentModule } from './agent.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AgentModule);

  const logger = new Logger('SysopsAgent');
  logger.log('Sysops agent started — monitoring trade-signal');
  logger.log(`API target: ${process.env['AGENT_API_URL'] || 'http://localhost:3000/api'}`);
  logger.log(`Jev: ${process.env['TYPESAFE_API_KEY'] ? 'enabled' : 'disabled (no API key)'}`);

  // Keep process alive
  process.on('SIGINT', async () => {
    logger.log('Shutting down...');
    await app.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.log('Shutting down...');
    await app.close();
    process.exit(0);
  });
}

bootstrap();
