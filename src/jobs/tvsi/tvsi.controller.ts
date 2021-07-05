import { Body, Controller, Get, HttpService, Post } from '@nestjs/common';
import { Observable } from 'rxjs';
import { TvsiService } from './tvsi.service';

@Controller('api/v1/tvsi/crawl')
export class TvsiCrawlController {
  constructor(private readonly tvsiService: TvsiService) {}
  @Get()
  crawlAllData(@Body() body: any): any {
    return this.tvsiService.crawlAllData(body.start, body.end).then((res) => {
      return {
        status: 'success',
        code: 200,
        data: 'res',
      };
    });
  }
}

@Controller('api/v1/tvsi/4m/value')
export class TvsiValueController {
  constructor(private readonly tvsiService: TvsiService) {}
  @Post()
  getValue(@Body() body: any): any {
    return this.tvsiService
      .getValue(body.start_year, body.end_year, body.stock_code)
      .then((res) => {
        return {
          status: 'success',
          code: 200,
          data: res,
        };
      });
  }
}

@Controller('api/v1/tvsi/4m')
export class Tvsi4MController {
  constructor(private readonly tvsiService: TvsiService) {}
  @Post()
  get4M(@Body() body: any): any {
    return this.tvsiService
      .get4M(body.end_year, body.stock_code, body.list_percent)
      .then((res) => {
        return {
          status: 'success',
          code: 200,
          data: res,
        };
      });
  }
}
@Controller('api/v1/tvsi/update/year')
export class TvsiCrawlDataYearController {
  constructor(private readonly tvsiService: TvsiService) {}
  @Post()
  setupCrawlDataYear(@Body() body: any): any {
    return this.tvsiService
      .setupCrawlDataYear(body.year, body.stock_code)
      .then((res) => {
        return {
          status: 'success',
          code: 200,
        };
      });
  }
}
@Controller('api/v1/tvsi/update/quarter')
export class TvsiCrawlDataQuarterController {
  constructor(private readonly tvsiService: TvsiService) {}
  @Post()
  setupCrawlDataQuarter(@Body() body: any): any {
    return this.tvsiService
      .setupCrawlDataQuarter(body.year, body.quarter, body.stock_code)
      .then((res) => {
        return {
          status: 'success',
          code: 200,
        };
      });
  }
}
@Controller('api/v1/tvsi/canslim')
export class TvsiCanslimController {
  constructor(private readonly tvsiService: TvsiService) {}
  @Post()
  getCanslim(@Body() body: any): any {
    return this.tvsiService.getCanslim(body.stock_code).then((resp) => {
      return {
        status: 'success',
        code: 200,
        data: resp,
      };
    });
  }
}
@Controller('api/v1/tvsi/update/year21')
export class TvsiUpdate21Controller {
  constructor(private readonly tvsiService: TvsiService) {}
  @Post()
  update21(@Body() body: any): any {
    return this.tvsiService.update21().then((resp) => {
      return {
        status: 'success',
        code: 200,
        data: resp,
      };
    });
  }
}
@Controller('api/v1/tvsi/4m/filter')
export class Tvsi4MFilterController {
  constructor(private readonly tvsiService: TvsiService) {}
  @Post()
  filter4M(@Body() body: any): any {
    return this.tvsiService
      .filter4M(
        body.end_year,
        body.range_point,
        body.list_reference,
        body.list_percent,
        body.list_proportion,
      )
      .then((resp) => {
        return {
          status: 'success',
          code: 200,
          data: resp,
        };
      });
  }
}

@Controller('api/v1/tvsi/canslim/filter')
export class TvsiCanslimFilterController {
  constructor(private readonly tvsiService: TvsiService) {}
  @Post()
  filterCanslim(@Body() body: any): any {
    return this.tvsiService
      .filterCanslim(
        body.range_point,
        body.list_reference,
        body.list_proportion,
      )
      .then((resp) => {
        return {
          status: 'success',
          code: 200,
          data: resp,
        };
      });
  }
}

@Controller('api/v1/tvsi/price')
export class TvsiPriceController {
  constructor(private readonly tvsiService: TvsiService) {}
  @Post()
  getPriceStock(@Body() body: any): any {
    return this.tvsiService
      .getPriceStock(body.stock_code)
      .then((resp: Observable<any>) => {
        return {
          status: 'success',
          code: 200,
          data: resp,
        };
      });
  }
}

@Controller('api/v1/tvsi/chart/value')
export class TvsiChartValueController {
  constructor(private readonly tvsiService: TvsiService) {}
  @Post()
  getChartData(@Body() body: any): any {
    return this.tvsiService
      .getChartData(body.stock_code)
      .then((resp: Observable<any>) => {
        return {
          status: 'success',
          code: 200,
          data: resp,
        };
      });
  }
}

@Controller('api/v1/tvsi/4m/chart')
export class TvsiChart4MController {
  constructor(private readonly tvsiService: TvsiService) {}
  @Post()
  getChart4M(@Body() body: any): any {
    return this.tvsiService
      .getChart4M(
        body.list_stock_code,
        body.end_year,
        body.list_reference,
        body.list_percent,
        body.list_proportion,
      )
      .then((resp: Observable<any>) => {
        return {
          status: 'success',
          code: 200,
          data: resp,
        };
      });
  }
}

@Controller('api/v1/tvsi/canslim/chart')
export class TvsiChartCanslimController {
  constructor(private readonly tvsiService: TvsiService) {}
  @Post()
  getChartCanslim(@Body() body: any): any {
    return this.tvsiService
      .getChartCanslim(
        body.list_stock_code,
        body.list_reference,
        body.list_proportion,
      )
      .then((resp: Observable<any>) => {
        return {
          status: 'success',
          code: 200,
          data: resp,
        };
      });
  }
}
