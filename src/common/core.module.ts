import { Global, Module } from '@nestjs/common';
import { RequestContextService } from './context/request-context.service';
import { UnitOfWork } from './transaction/unit-of-work.service';

@Global()
@Module({
  providers: [RequestContextService, UnitOfWork],
  exports: [RequestContextService, UnitOfWork],
})
export class CoreModule {}
