import {ForbiddenException, Inject, Injectable, NotFoundException, Scope} from '@nestjs/common';
import {UnitOfWork} from '../../common/transaction/unit-of-work.service';
import {Account} from '../../infra/database/entities/account.entity';
import {Request} from 'express';
import {REQUEST} from '@nestjs/core';

@Injectable({scope: Scope.REQUEST})
export class AccountService {
    constructor(private readonly uow: UnitOfWork, @Inject(REQUEST) private readonly req: Request & { user?: any }) {
    }

    private get user() {
        return this.req.user as { userId: string; role: 'user' | 'admin' };
    }

    async me() {
        const repo = this.uow.getRepository(Account);
        const me = await repo.findOne({where: {id: this.user.userId}});
        if (!me) throw new NotFoundException('User not found');
        return {id: me.id, email: me.email, role: me.role};
    }

    async findAll() {
        const repo = this.uow.getRepository(Account);
        const list = await repo.find();
        return list.map((a) => ({id: a.id, email: a.email, role: a.role}));
    }

    async update(id: string, dto: { email?: string; password?: string }) {
        const repo = this.uow.getRepository(Account);
        const target = await repo.findOne({where: {id}});
        if (!target) throw new NotFoundException('Account not found');
        if (this.user.role !== 'admin' && this.user.userId !== id) throw new ForbiddenException();
        if (dto.email) target.email = dto.email;
        if (dto.password) target.passwordHash = await Account.hashPassword(dto.password);
        await repo.save(target);
        return {id: target.id, email: target.email, role: target.role};
    }

    async remove(id: string) {
        const repo = this.uow.getRepository(Account);
        const target = await repo.findOne({where: {id}});
        if (!target) throw new NotFoundException('Account not found');
        if (this.user.role !== 'admin' && this.user.userId !== id) throw new ForbiddenException();
        await repo.remove(target);
        return {success: true};
    }
}
