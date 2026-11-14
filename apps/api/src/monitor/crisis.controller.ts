/**
 * B3.1: Crisis review endpoints (staff-facing)
 * GET /v1/crisis-reviews (list with filters)
 * GET /v1/crisis-reviews/:id (detail with flags)
 * POST /v1/crisis-reviews/:id/assign (assign to Reviewer)
 * POST /v1/crisis-reviews/:id/transition (state machine)
 * POST /v1/crisis-reviews/:id/reveal-contact (with audit)
 */

import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CrisisService } from './crisis.service';
import {
  CrisisReviewDto,
  CrisisReviewQueryDto,
  AssignCrisisReviewDto,
  TransitionCrisisReviewDto,
  RevealContactDto,
  RevealedContactDto,
} from './dto/crisis.dto';
import { AppError, ERROR_CODES } from '../common/errors';

@Controller('v1/crisis-reviews')
export class CrisisController {
  constructor(private readonly crisisService: CrisisService) {}

  /**
   * GET /v1/crisis-reviews
   * List crisis reviews with filters
   * Requires: app_reviewer role
   */
  @Get()
  async listReviews(@Query() query: CrisisReviewQueryDto): Promise<CrisisReviewDto[]> {
    // TODO: Check app_reviewer role (from RoleGuard)
    return await this.crisisService.listReviews(query);
  }

  /**
   * GET /v1/crisis-reviews/:id
   * Get single crisis review with de-identified flags
   */
  @Get(':id')
  async getReview(@Param('id') reviewId: string): Promise<CrisisReviewDto> {
    // TODO: Check app_reviewer role
    return await this.crisisService.getReview(reviewId);
  }

  /**
   * POST /v1/crisis-reviews/:id/assign
   * Assign a crisis review to a Reviewer
   */
  @Post(':id/assign')
  @HttpCode(HttpStatus.OK)
  async assignReview(
    @Param('id') reviewId: string,
    @Body() dto: AssignCrisisReviewDto,
    @Request() req: any,
  ): Promise<CrisisReviewDto> {
    const actorId = req.user?.staffId;
    if (!actorId) {
      throw new AppError(401, ERROR_CODES.UNAUTHORIZED, 'Unauthorized');
    }

    return await this.crisisService.assignReview(reviewId, dto, actorId);
  }

  /**
   * POST /v1/crisis-reviews/:id/transition
   * Transition a crisis review (state machine validation)
   */
  @Post(':id/transition')
  @HttpCode(HttpStatus.OK)
  async transitionReview(
    @Param('id') reviewId: string,
    @Body() dto: TransitionCrisisReviewDto,
    @Request() req: any,
  ): Promise<CrisisReviewDto> {
    const actorId = req.user?.staffId;
    if (!actorId) {
      throw new AppError(401, ERROR_CODES.UNAUTHORIZED, 'Unauthorized');
    }

    return await this.crisisService.transitionReview(reviewId, dto, actorId);
  }

  /**
   * POST /v1/crisis-reviews/:id/reveal-contact
   * Reveal contact info for a crisis review (with audit reason)
   */
  @Post(':id/reveal-contact')
  @HttpCode(HttpStatus.OK)
  async revealContact(
    @Param('id') reviewId: string,
    @Body() dto: RevealContactDto,
    @Request() req: any,
  ): Promise<RevealedContactDto> {
    const actorId = req.user?.staffId;
    if (!actorId) {
      throw new AppError(401, ERROR_CODES.UNAUTHORIZED, 'Unauthorized');
    }

    return await this.crisisService.revealContact(reviewId, dto, actorId);
  }
}
