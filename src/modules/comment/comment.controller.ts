import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post as HttpPost,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { CommentService } from './comment.service';
import { IsString, MinLength } from 'class-validator';

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
  constructor(private readonly service: CommentService) {}

  @ApiOperation({ summary: 'List comments' })
  @Get()
  list(@Param('postId') postId: string) {
    return this.service.list(postId);
  }

  @ApiOperation({ summary: 'Create a comment' })
  @HttpPost()
  create(@Param('postId') postId: string, @Body() dto: CreateCommentDto) {
    return this.service.create(postId, dto);
  }

  @ApiOperation({ summary: 'Update a comment (self or admin)' })
  @Patch(':commentId')
  update(
    @Param('postId') postId: string,
    @Param('commentId') commentId: string,
    @Body() dto: UpdateCommentDto,
  ) {
    return this.service.update(postId, commentId, dto);
  }

  @ApiOperation({ summary: 'Delete a comment (self or admin)' })
  @Delete(':commentId')
  remove(
    @Param('postId') postId: string,
    @Param('commentId') commentId: string,
  ) {
    return this.service.remove(postId, commentId);
  }
}
