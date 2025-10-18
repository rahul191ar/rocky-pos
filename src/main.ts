import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
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

  // Configure Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('Rocky POS API')
    .setDescription('A comprehensive Point of Sale (POS) system API built with NestJS and Prisma')
    .setVersion('1.0')
    .addTag('Authentication', 'Authentication and authorization endpoints')
    .addTag('Users', 'User management operations')
    .addTag('Products', 'Product catalog management')
    .addTag('Suppliers', 'Supplier management')
    .addTag('Customers', 'Customer management')
    .addTag('Sales', 'Sales transaction management')
    .addTag('Purchases', 'Purchase order management')
    .addTag('Expenses', 'Business expense tracking')
    .addTag('Dashboard', 'Dashboard and summary statistics')
    .addTag('Invoices', 'Invoice and billing management')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        in: 'header',
      },
      'JWT-auth',
    )
    .addServer('http://localhost:3000', 'Development server')
    .addServer('https://api.rockypos.com', 'Production server')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customSiteTitle: 'Rocky POS API Documentation',
    customfavIcon: '/favicon.ico',
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info .title { color: #1976d2 }
    `,
  });

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
  console.log(`📚 API Documentation available at: ${await app.getUrl()}/api/docs`);
}
bootstrap();
