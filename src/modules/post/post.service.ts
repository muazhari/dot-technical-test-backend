import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  Scope,
} from '@nestjs/common';
import { UnitOfWork } from '../../common/transaction/unit-of-work.service';
import { Post } from '../../infra/database/entities/post.entity';
import { Account, Role } from '../../infra/database/entities/account.entity';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';

@Injectable({ scope: Scope.REQUEST })
export class PostService {
  constructor(
    private readonly uow: UnitOfWork,
    @Inject(REQUEST) private readonly req: Request & { user?: any },
  ) {}

  private get user() {
    return this.req.user as { userId: string; role: Role };
  }

  async list() {
    const repo = this.uow.getRepository(Post);
    const list = await repo.find({ order: { createdAt: 'DESC' } });
    return list.map((p) => ({
      id: p.id,
      content: p.content,
      authorId: p.author.id,
      createdAt: p.createdAt,
    }));
  }

  async create(dto: { content: string }) {
    const postRepo = this.uow.getRepository(Post);
    const accountRepo = this.uow.getRepository(Account);
    const author = await accountRepo.findOne({
      where: { id: this.user.userId },
    });
    if (!author) throw new NotFoundException('Author not found');
    const post = postRepo.create({ content: dto.content, author });
    await postRepo.save(post);
    return { id: post.id, content: post.content, authorId: author.id };
  }

  async update(postId: string, dto: { content: string }) {
    const postRepo = this.uow.getRepository(Post);
    const post = await postRepo.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    if (this.user.role !== 'admin' && post.author.id !== this.user.userId)
      throw new ForbiddenException();
    post.content = dto.content;
    await postRepo.save(post);
    return { id: post.id, content: post.content };
  }

  async remove(postId: string) {
    const postRepo = this.uow.getRepository(Post);
    const post = await postRepo.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    if (this.user.role !== 'admin' && post.author.id !== this.user.userId)
      throw new ForbiddenException();
    await postRepo.remove(post);
    return { success: true };
  }
}
