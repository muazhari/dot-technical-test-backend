import {Body, Controller, Post} from '@nestjs/common';
import {ApiOperation, ApiTags} from '@nestjs/swagger';
import {AuthService} from './auth.service';
import {IsEmail, IsString, MinLength} from 'class-validator';

class RegisterDto {
    @IsEmail()
    email!: string;

    @IsString()
    @MinLength(1)
    password!: string;
}

class LoginDto {
    @IsEmail()
    email!: string;

    @IsString()
    password!: string;
}

@ApiTags('auths')
@Controller('auths')
export class AuthController {
    constructor(private readonly auth: AuthService) {
    }

    @ApiOperation({summary: 'Register a new account'})
    @Post('register')
    register(@Body() dto: RegisterDto) {
        return this.auth.register(dto.email, dto.password);
    }

    @ApiOperation({summary: 'Login and get JWT'})
    @Post('login')
    login(@Body() dto: LoginDto) {
        return this.auth.login(dto.email, dto.password);
    }
}

