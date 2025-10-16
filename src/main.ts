import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Set global prefix
  app.setGlobalPrefix('api');

  // Use global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }));

  // Enable shutdown hooks for Prisma
  const prismaService = app.get(PrismaService);
  await prismaService.enableShutdownHooks(app);

  // Test database connection and log status
  try {
    await prismaService.$connect();
    console.log('✅ Database connected successfully');
    console.log('📊 Database URL:', process.env.DATABASE_URL?.replace(/:[^:]+@/, ':***@')); // Hide password in logs
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('🔧 Please check your DATABASE_URL in .env file');
  }

  await app.listen(process.env.PORT ?? 3000);
  console.log(`🚀 Rocky POS API is running on: ${await app.getUrl()}`);
}
bootstrap();
