import {Injectable, NestMiddleware} from '@nestjs/common';
import {NextFunction, Request, Response} from 'express';
import {RequestContextService} from './request-context.service';

@Injectable()
export class AlsMiddleware implements NestMiddleware {
    constructor(private readonly ctx: RequestContextService) {
    }

    use(req: Request, res: Response, next: NextFunction) {
        this.ctx.run(() => next());
    }
}

