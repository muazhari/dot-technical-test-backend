import { Injectable } from '@nestjs/common';
import {
  EntityManager,
  EntityTarget,
  ObjectLiteral,
  Repository,
} from 'typeorm';
import { RequestContextService } from '../context/request-context.service';
import { CLS_ENTITY_MANAGER } from './transaction.interceptor';

@Injectable()
export class UnitOfWork {
  constructor(private readonly ctx: RequestContextService) {}

  getRepository<T extends ObjectLiteral>(
    entity: EntityTarget<T>,
  ): Repository<T> {
    const manager: EntityManager | undefined = this.ctx.get(CLS_ENTITY_MANAGER);
    if (!manager) {
      throw new Error(
        'No EntityManager found in context. Make sure that the UnitOfWork is used within a transaction.',
      );
    }
    return manager.getRepository(entity);
  }
}
