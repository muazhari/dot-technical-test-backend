import {BadRequestException, Injectable, UnauthorizedException} from '@nestjs/common';
import {JwtService} from '@nestjs/jwt';
import {UnitOfWork} from '../../common/transaction/unit-of-work.service';
import {Account} from '../../infra/database/entities/account.entity';

@Injectable()
export class AuthService {
    constructor(private readonly jwt: JwtService, private readonly uow: UnitOfWork) {
    }

    async register(email: string, password: string) {
        const repo = this.uow.getRepository(Account);
        const exists = await repo.findOne({where: {email}});
        if (exists) throw new BadRequestException('Email already in use');
        const account = repo.create({email, passwordHash: await Account.hashPassword(password), role: 'user'});
        await repo.save(account);
        return {id: account.id, email: account.email, role: account.role};
    }

    async login(email: string, password: string) {
        const repo = this.uow.getRepository(Account);
        const account = await repo.findOne({where: {email}});
        if (!account || !(await account.comparePassword(password))) {
            throw new UnauthorizedException('Invalid credentials');
        }
        const payload = {sub: account.id, email: account.email, role: account.role};
        const token = await this.jwt.signAsync(payload, {
            secret: process.env.JWT_SECRET || 'dev_secret',
            expiresIn: '7d'
        });
        return {access_token: token};
    }
}

