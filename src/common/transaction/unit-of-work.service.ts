import {Injectable} from '@nestjs/common';
import {EntityTarget, ObjectLiteral, Repository} from 'typeorm';
import {RequestContextService} from '../context/request-context.service';
import {CLS_ENTITY_MANAGER} from './transaction.interceptor';

@Injectable()
export class UnitOfWork {
    constructor(private readonly ctx: RequestContextService) {
    }

    getRepository<T extends ObjectLiteral>(entity: EntityTarget<T>): Repository<T> {
        const manager = this.ctx.get(CLS_ENTITY_MANAGER);
        return manager.getRepository(entity);
    }
}
