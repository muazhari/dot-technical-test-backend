import {Body, Controller, Delete, Get, Param, Patch, UseGuards} from '@nestjs/common';
import {ApiBearerAuth, ApiOperation, ApiTags} from '@nestjs/swagger';
import {JwtAuthGuard} from '../common.guard';
import {Roles} from '../../common/auth/roles.decorator';
import {RolesGuard} from '../../common/auth/roles.guard';
import {AccountService} from './account.service';
import {IsEmail, IsOptional, IsString, MinLength} from 'class-validator';

class UpdateAccountDto {
    @IsEmail()
    @IsOptional()
    email?: string;

    @IsString()
    @MinLength(1)
    @IsOptional()
    password?: string;
}

@ApiTags('accounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('accounts')
export class AccountController {
    constructor(private readonly service: AccountService) {
    }

    @ApiOperation({summary: 'Get current authenticated account'})
    @Get('me')
    me() {
        return this.service.me();
    }

    @ApiOperation({summary: 'List all accounts (admin only)'})
    @Get()
    @Roles('admin')
    findAll() {
        return this.service.findAll();
    }

    @ApiOperation({summary: 'Update an account (self or admin)'})
    @Patch(':id')
    update(@Param('id') id: string, @Body() dto: UpdateAccountDto) {
        return this.service.update(id, dto);
    }

    @ApiOperation({summary: 'Delete an account (self or admin)'})
    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.service.remove(id);
    }
}
