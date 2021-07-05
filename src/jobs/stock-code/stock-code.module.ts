import { Module } from '@nestjs/common';
import {
  StockCodeController,
  StockController,
  StockSaveController,
} from './stock-code.controller';
import { StockCodeService } from './stock-code.service';

@Module({
  controllers: [StockCodeController, StockSaveController, StockController],
  providers: [StockCodeService],
})
export class StockCodeModule {}
