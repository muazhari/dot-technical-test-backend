import {ForbiddenException, Inject, Injectable, NotFoundException, Scope} from '@nestjs/common';
import {UnitOfWork} from '../../common/transaction/unit-of-work.service';
import {Post} from '../../infra/database/entities/post.entity';
import {Comment} from '../../infra/database/entities/comment.entity';
import {Account} from '../../infra/database/entities/account.entity';
import {REQUEST} from '@nestjs/core';
import {Request} from 'express';

@Injectable({scope: Scope.REQUEST})
export class CommentService {
    constructor(private readonly uow: UnitOfWork, @Inject(REQUEST) private readonly req: Request & { user?: any }) {
    }

    private get user() {
        return this.req.user as { userId: string; role: 'user' | 'admin' };
    }

    async list(postId: string) {
        const commentRepo = this.uow.getRepository(Comment);
        const list = await commentRepo.find({where: {post: {id: postId}}, order: {createdAt: 'ASC'}});
        return list.map((c) => ({id: c.id, content: c.content, authorId: c.author.id}));
    }

    async create(postId: string, dto: { content: string }) {
        const postRepo = this.uow.getRepository(Post);
        const accountRepo = this.uow.getRepository(Account);
        const commentRepo = this.uow.getRepository(Comment);
        const post = await postRepo.findOne({where: {id: postId}});
        if (!post) throw new NotFoundException('Post not found');
        const author = await accountRepo.findOne({where: {id: this.user.userId}});
        if (!author) throw new NotFoundException('Author not found');
        const comment = commentRepo.create({content: dto.content, post, author});
        await commentRepo.save(comment);
        return {id: comment.id, content: comment.content, authorId: author.id};
    }

    async update(postId: string, id: string, dto: { content: string }) {
        const commentRepo = this.uow.getRepository(Comment);
        const comment = await commentRepo.findOne({where: {id, post: {id: postId}}});
        if (!comment) throw new NotFoundException('Comment not found');
        if (this.user.role !== 'admin' && comment.author.id !== this.user.userId) throw new ForbiddenException();
        comment.content = dto.content;
        await commentRepo.save(comment);
        return {id: comment.id, content: comment.content};
    }

    async remove(postId: string, id: string) {
        const commentRepo = this.uow.getRepository(Comment);
        const comment = await commentRepo.findOne({where: {id, post: {id: postId}}});
        if (!comment) throw new NotFoundException('Comment not found');
        if (this.user.role !== 'admin' && comment.author.id !== this.user.userId) throw new ForbiddenException();
        await commentRepo.remove(comment);
        return {success: true};
    }
}
