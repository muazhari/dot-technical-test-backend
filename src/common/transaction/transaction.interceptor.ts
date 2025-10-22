import {CallHandler, ExecutionContext, Injectable, NestInterceptor} from '@nestjs/common';
import {from, lastValueFrom, Observable} from 'rxjs';
import {DataSource} from 'typeorm';
import {RequestContextService} from '../context/request-context.service';

export const CLS_ENTITY_MANAGER = 'ENTITY_MANAGER';

@Injectable()
export class TransactionInterceptor implements NestInterceptor {
    constructor(private readonly dataSource: DataSource, private readonly ctx: RequestContextService) {
    }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const queryRunner = this.dataSource.createQueryRunner();

        const run = async () => {
            try {
                await queryRunner.connect();
                await queryRunner.startTransaction('READ COMMITTED');

                return await this.ctx.run(async () => {
                    this.ctx.set(CLS_ENTITY_MANAGER, queryRunner.manager);

                    try {
                        const result = await lastValueFrom(next.handle());
                        await queryRunner.commitTransaction();
                        return result;
                    } catch (err) {
                        try {
                            await queryRunner.rollbackTransaction();
                        } catch {
                            // ignore rollback errors
                        }
                        throw err;
                    }
                });
            } finally {
                try {
                    await queryRunner.release();
                } catch {
                    // ignore release errors
                }
            }
        };

        return from(run())
    }
}
