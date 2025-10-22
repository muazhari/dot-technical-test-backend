import {Body, Controller, Delete, Get, Param, Patch, Post as HttpPost, UseGuards} from '@nestjs/common';
import {ApiBearerAuth, ApiOperation, ApiTags} from '@nestjs/swagger';
import {JwtAuthGuard} from '../common.guard';
import {RolesGuard} from '../../common/auth/roles.guard';
import {PostService} from './post.service';
import {IsString, MinLength} from 'class-validator';

class CreatePostDto {
    @IsString()
    @MinLength(1)
    content!: string;
}

class UpdatePostDto {
    @IsString()
    @MinLength(1)
    content!: string;
}

@ApiTags('posts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('posts')
export class PostController {
    constructor(private readonly service: PostService) {
    }

    @ApiOperation({summary: 'List posts'})
    @Get()
    list() {
        return this.service.list();
    }

    @ApiOperation({summary: 'Create a post'})
    @HttpPost()
    create(@Body() dto: CreatePostDto) {
        return this.service.create(dto);
    }

    @ApiOperation({summary: 'Update a post (self or admin)'})
    @Patch(':id')
    update(@Param('id') id: string, @Body() dto: UpdatePostDto) {
        return this.service.update(id, dto);
    }

    @ApiOperation({summary: 'Delete a post (self or admin)'})
    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.service.remove(id);
    }
}
