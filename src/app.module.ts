import {MiddlewareConsumer, Module, NestModule, ValidationPipe} from '@nestjs/common';
import {ConfigModule} from '@nestjs/config';
import {TypeOrmModule} from '@nestjs/typeorm';
import {Account} from './infra/database/entities/account.entity';
import {Post} from './infra/database/entities/post.entity';
import {Comment} from './infra/database/entities/comment.entity';
import {APP_INTERCEPTOR, APP_PIPE} from '@nestjs/core';
import {TransactionInterceptor} from './common/transaction/transaction.interceptor';
import {AuthModule} from './modules/auth/auth.module';
import {AccountService} from './modules/account/account.service';
import {AccountController} from './modules/account/account.controller';
import {PostService} from './modules/post/post.service';
import {PostController} from './modules/post/post.controller';
import {CommentService} from './modules/comment/comment.service';
import {CommentController} from './modules/comment/comment.controller';
import {AlsMiddleware} from './common/context/als.middleware';
import {CoreModule} from './common/core.module';

@Module({
    imports: [
        ConfigModule.forRoot({isGlobal: true}),
        TypeOrmModule.forRootAsync({
            name: 'default',
            useFactory: () => ({
                type: 'postgres' as const,
                host: process.env.DATASTORE_1_HOST || 'localhost',
                port: parseInt(process.env.DATASTORE_1_PORT || '5432', 10),
                username: process.env.DATASTORE_1_USER || 'postgres',
                password: process.env.DATASTORE_1_PASSWORD || 'postgres',
                database: process.env.DATASTORE_1_DATABASE || 'social_app',
                entities: [Account, Post, Comment],
                synchronize: false,
                autoLoadEntities: false,
            }),
        }),
        CoreModule,
        AuthModule,
    ],
    controllers: [AccountController, PostController, CommentController],
    providers: [
        {provide: APP_INTERCEPTOR, useClass: TransactionInterceptor},
        // Global guards removed to keep /auths endpoints public
        {provide: APP_PIPE, useFactory: () => new ValidationPipe({whitelist: true, transform: true})},
        AccountService,
        PostService,
        CommentService,
    ],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(AlsMiddleware).forRoutes('*');
    }
}
