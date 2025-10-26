import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { RequestContextService } from '../context/request-context.service';
import { from, lastValueFrom, Observable } from 'rxjs';

export const CLS_ENTITY_MANAGER = 'ENTITY_MANAGER';

@Injectable()
export class TransactionInterceptor implements NestInterceptor {
  constructor(
    private readonly dataSource: DataSource,
    private readonly ctx: RequestContextService,
  ) {}

  isSerializationError = (err: any) => {
    return err?.code === '40001';
  };

  sleep = (time: number) => new Promise((res) => setTimeout(res, time));

  intercept(
    context: ExecutionContext,
    next: CallHandler<any>,
  ): Observable<any> | Promise<Observable<any>> {
    const maxRetries = 20;
    const baseDelayMs = 50;

    const runOnce = async () => {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();

      return await this.ctx.run(async () => {
        try {
          this.ctx.set(CLS_ENTITY_MANAGER, queryRunner.manager);
          await queryRunner.startTransaction('SERIALIZABLE');
          const result = await lastValueFrom(next.handle());
          await queryRunner.commitTransaction();
          await queryRunner.release();
          return result;
        } catch (err) {
          await queryRunner.rollbackTransaction();
          await queryRunner.release();
          throw err;
        }
      });
    };

    const runWithRetries = async () => {
      let attempt = 0;
      while (true) {
        try {
          return await runOnce();
        } catch (err) {
          if (attempt >= maxRetries || !this.isSerializationError(err)) {
            throw err;
          }
          const delay =
            baseDelayMs * Math.pow(2, attempt) +
            Math.floor(Math.random() * baseDelayMs);
          attempt++;
          await this.sleep(delay);
        }
      }
    };

    return from(runWithRetries());
  }
}
