import { Body, Controller, Get, Post } from '@nestjs/common';
import { StockCodeService } from './stock-code.service';

@Controller('api/v1/stock-code')
export class StockCodeController {
  constructor(private readonly stockCodeService: StockCodeService) {}
  @Get()
  getStockCode(): any {
    return this.stockCodeService.getStockCode().then((res) => {
      return this.stockCodeService.saveDB(res).then(() => {
        return {
          status: 'success',
          code: 200,
          total: res.length,
        };
      });
    });
  }
}

@Controller('api/v1/stock-update')
export class StockSaveController {
  constructor(private readonly stockCodeService: StockCodeService) {}
  @Get()
  getStockCode(): any {
    this.stockCodeService.getBranch();
    return {
      status: 'success',
      code: 200,
    };
  }
}

@Controller('api/v1/stock')
export class StockController {
  constructor(private readonly stockCodeService: StockCodeService) {}
  @Get()
  getStockCode(): any {
    return this.stockCodeService.getAll().then((res) => {
      return {
        status: 'success',
        code: 200,
        data: res,
      };
    });
  }
}
