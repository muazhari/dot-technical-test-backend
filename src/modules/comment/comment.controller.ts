import {Body, Controller, Delete, Get, Param, Patch, Post as HttpPost, UseGuards} from '@nestjs/common';
import {ApiBearerAuth, ApiTags} from '@nestjs/swagger';
import {JwtAuthGuard} from '../common.guard';
import {RolesGuard} from '../../common/auth/roles.guard';
import {CommentService} from './comment.service';
import {IsString, MinLength} from 'class-validator';

class CreateCommentDto {
    @IsString()
    @MinLength(1)
    content!: string;
}

class UpdateCommentDto {
    @IsString()
    @MinLength(1)
    content!: string;
}

@ApiTags('comments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('posts/:postId/comments')
export class CommentController {
    constructor(private readonly service: CommentService) {
    }

    @Get()
    list(@Param('postId') postId: string) {
        return this.service.list(postId);
    }

    @HttpPost()
    create(@Param('postId') postId: string, @Body() dto: CreateCommentDto) {
        return this.service.create(postId, dto);
    }

    @Patch(':id')
    update(@Param('postId') postId: string, @Param('id') id: string, @Body() dto: UpdateCommentDto) {
        return this.service.update(postId, id, dto);
    }

    @Delete(':id')
    remove(@Param('postId') postId: string, @Param('id') id: string) {
        return this.service.remove(postId, id);
    }
}
