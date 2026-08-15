import { Controller, Get, Query, HttpException, HttpStatus } from '@nestjs/common';
import { StatsService } from './stats.service';

@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('snapshot')
  async getSnapshot() {
    try {
      return await this.statsService.getSnapshot();
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('timeseries')
  async getTimeseries(
      @Query('groupBy') groupBy?: string,
      @Query('from') from?: string,
      @Query('to') to?: string,
  ) {
    try {
      return await this.statsService.getTimeseries(groupBy, from, to);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('classes')
  async getClassPopularity(
      @Query('from') from?: string,
      @Query('to') to?: string,
  ) {
    try {
      return await this.statsService.getClassPopularity(from, to);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
