import { Injectable, ValidationPipe as NestValidationPipe, ValidationError } from '@nestjs/common';

@Injectable()
export class ValidationPipe extends NestValidationPipe {
  constructor() {
    super({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors: ValidationError[]) => {
        const messages = errors.map(error => {
          return {
            field: error.property,
            errors: Object.values(error.constraints || {}),
          };
        });

        return {
          statusCode: 400,
          message: messages.flatMap(msg => msg.errors),
          error: 'Bad Request',
        };
      },
    });
  }
}
