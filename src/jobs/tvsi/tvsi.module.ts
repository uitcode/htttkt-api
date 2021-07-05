import { HttpModule, Module } from '@nestjs/common';
import {
  Tvsi4MController,
  Tvsi4MFilterController,
  TvsiCanslimController,
  TvsiCanslimFilterController,
  TvsiChart4MController,
  TvsiChartCanslimController,
  TvsiChartValueController,
  TvsiCrawlController,
  TvsiCrawlDataQuarterController,
  TvsiCrawlDataYearController,
  TvsiPriceController,
  TvsiUpdate21Controller,
  TvsiValueController,
} from './tvsi.controller';
import { TvsiService } from './tvsi.service';

@Module({
  controllers: [
    TvsiCrawlController,
    TvsiValueController,
    Tvsi4MController,
    TvsiCrawlDataYearController,
    TvsiCrawlDataQuarterController,
    TvsiCanslimController,
    TvsiUpdate21Controller,
    Tvsi4MFilterController,
    TvsiCanslimFilterController,
    TvsiPriceController,
    TvsiChartValueController,
    TvsiChart4MController,
    TvsiChartCanslimController,
  ],
  imports: [HttpModule],
  providers: [TvsiService],
})
export class TvsiModule {}
