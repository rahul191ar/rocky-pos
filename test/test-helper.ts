import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

export class TestHelper {
  static async createTestingModule(module: any): Promise<TestingModule> {
    return Test.createTestingModule({
      imports: [module],
    }).compile();
  }

  static async createTestApp(module: any): Promise<INestApplication> {
    const testingModule = await Test.createTestingModule({
      imports: [module],
    }).compile();

    const app = testingModule.createNestApplication();
    await app.init();
    return app;
  }

  static async createAuthenticatedRequest(app: INestApplication, token?: string) {
    const req = request(app.getHttpServer());
    if (token) {
      req.set('Authorization', `Bearer ${token}`);
    }
    return req;
  }
}
