import { TvsiModule } from './jobs/tvsi/tvsi.module';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { StockCodeModule } from './jobs/stock-code/stock-code.module';

@Module({
  imports: [StockCodeModule, TvsiModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
