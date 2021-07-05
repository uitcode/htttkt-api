import { HttpService, Injectable } from '@nestjs/common';
import { field } from './field';
import { map } from 'rxjs/operators';
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');

const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
let adapterTvsi = new FileSync('src/database/tvsi-database.json');
let dbTvsi = low(adapterTvsi);

const adapterStock = new FileSync('src/database/database.json');
const dbStock = low(adapterStock);

dbTvsi.defaults({ tvsi: [] }).write();

@Injectable()
export class TvsiService {
  browser: any;
  page: any;

  constructor(private httpService: HttpService) {}

  async closeBrowser(browser) {
    let pages = await browser.pages();
    await Promise.all(pages.map((page) => page.close()));
    await browser.close();
  }

  async newPage(): Promise<any> {
    const browser = await puppeteer.launch(
      // Setting optimal puppeteer
      {
        headless: true,
        args: [
          '--disable-web-security',
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--window-size=1920x1080',
        ],
      },
    );

    // Setting optimal open new tab puppeteer
    const blockedResourceTypes = [
      'image',
      'media',
      'font',
      'texttrack',
      'object',
      'beacon',
      'csp_report',
      'imageset',
    ];

    const skippedResources = [
      'quantserve',
      'adzerk',
      'doubleclick',
      'adition',
      'exelator',
      'sharethrough',
      'cdn.api.twitter',
      'google-analytics',
      'googletagmanager',
      'google',
      'fontawesome',
      'facebook',
      'analytics',
      'optimizely',
      'clicktale',
      'mixpanel',
      'zedo',
      'clicksor',
      'tiqcdn',
    ];

    const page = await browser.newPage();

    // Optimal loại bỏ các resources không cần thiết
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const requestUrl = request._url.split('?')[0].split('#')[0];
      if (
        blockedResourceTypes.indexOf(request.resourceType()) !== -1 ||
        skippedResources.some((resource) => requestUrl.indexOf(resource) !== -1)
      ) {
        request.abort();
      } else {
        request.continue();
      }
    });
    // return [page, browser];
    this.browser = browser;
    this.page = page;

    return true;
  }

  getPath(branch: string, type: number): string {
    switch (type) {
      case 0: // chi_tieu_tai_chinh
        if (branch == 'NGAN HANG') {
          return 'chitieutaichinhbank';
        } else {
          return 'chitieutaichinh';
        }
      case 1: // luu_chuyen_tien_te_gian_tiep
        if (branch == 'NGAN HANG') {
          return 'LuuChuyenTienTegiantiep';
        } else if (branch == 'BAO HIEM') {
          return 'LuuChuyenTienTegiantiep';
        } else if (branch == 'CHUNG KHOAN') {
          return 'LuuChuyenTienTegiantiepCK';
        } else {
          return 'LuuChuyenTienTegiantiep';
        }
      case 2: // bao_cao_ket_qua_kinh_doanh
        if (branch == 'NGAN HANG') {
          return 'BaoCaoKetQuaKdBank';
        } else if (branch == 'BAO HIEM') {
          return 'BaoCaoKetQuaKdBH';
        } else if (branch == 'CHUNG KHOAN') {
          return 'BaoCaoKetQuaKdCK';
        } else {
          return 'BaoCaoKetQuaKd';
        }

      case 3: // bang_can_doi_ke_toan
        if (branch == 'NGAN HANG') {
          return 'BangCanDoiKeToanBank';
        } else if (branch == 'BAO HIEM') {
          return 'BangCanDoiKeToanBaoHiem';
        } else if (branch == 'CHUNG KHOAN') {
          return 'BangCanDoiKeToanCK';
        } else {
          return 'BangCanDoiKeToan';
        }

      default:
        break;
    }
  }

  async setupCrawlDataYear(year: number[], stockCode: string): Promise<any> {
    adapterTvsi = new FileSync(`src/database/tvsi/${stockCode}.json`);
    dbTvsi = low(adapterTvsi);
    let dataStock: any = await dbTvsi
      .get('value')
      .find({ code: stockCode })
      .cloneDeep()
      .value();

    let y21 = {
      '2021': {
        quarter: {
          q1: {},
          q2: {},
          q3: {},
          q4: {},
        },
      },
    };
    if (!dataStock) {
      await dbTvsi.defaults({ value: [] }).write();
      let stock = await dbStock
        .get('stock')
        .find({ code: stockCode })
        .cloneDeep()
        .value();

      await dbTvsi
        .get('value')
        .push({ ...stock, data: year[0] === 2021 ? y21 : {} })
        .write();
    } else if (!dataStock.data['2021']) {
      await dbTvsi
        .get('value')
        .remove((stock) => stock)
        .write();
      dataStock.data['2021'] = y21['2021'];
      await dbTvsi.get('value').push(dataStock).write();
    }
    await this.newPage();
    await this.crawlDataYear(year, stockCode);
    await this.closeBrowser(this.browser);
    return true;
  }

  async crawlDataYear(year: number[], stockCode: string): Promise<any> {
    adapterTvsi = new FileSync(`src/database/tvsi/${stockCode}.json`);
    dbTvsi = low(adapterTvsi);
    let resp = await this.crawlData(stockCode, year, 1, field);
    await this.calculateOtherIndicatorsYear(stockCode, year);
    return resp;
  }

  async setupCrawlDataQuarter(
    year: number,
    quarter: string[],
    stockCode: string,
  ): Promise<any> {
    await this.newPage();
    await this.crawlDataQuarter(year, quarter, stockCode);
    await this.closeBrowser(this.browser);
    return true;
  }

  async crawlDataQuarter(
    year: number,
    quarter: string[],
    stockCode: string,
  ): Promise<any> {
    adapterTvsi = new FileSync(`src/database/tvsi/${stockCode}.json`);
    dbTvsi = low(adapterTvsi);
    let yearRange = [year - 1, year, year + 1];
    return await this.asyncForEach(yearRange, async (yearCurrent) => {
      let resp = await this.crawlData(
        stockCode,
        [yearCurrent],
        2,
        field,
        year,
        quarter,
      );
      await this.calculateOtherIndicatorsQuarter(stockCode, year, quarter);
      return resp;
    });
  }

  async crawlData(
    stockCode: string,
    // year: number,
    yearRange: number[],
    period: number,
    field: any,
    getOnlyYear: number = 2020,
    quarter: string[] = ['q1', 'q2', 'q3', 'q4'],
  ): Promise<any> {
    // return this.newPage().then(async (p) => {
    let branch = dbStock.get('stock').find({ code: stockCode }).value().branch;

    for (let iYear = 0; iYear < yearRange.length; iYear += 5) {
      for (let iTab = 0; iTab < 4; iTab++) {
        let path = this.getPath(branch, iTab);
        let url = `http://finance.tvsi.com.vn/Enterprises/${path}?symbol=${stockCode}&YearView=${yearRange[iYear]}&period=${period}&donvi=1000`;
        await this.page.goto(url, { waitUntil: 'load', timeout: 0 });

        let results = await this.page.evaluate(
          () => document.querySelector('table')?.outerHTML,
        );

        if (results) {
          let $ = cheerio.load(results);
          let resultDataHeader = [];
          // Tách header
          let listHeader = $('tbody').find('tr.header td');
          listHeader.each(function (i, e) {
            if (i > 1 && $(this).html()) {
              let yearHeader = $(this)
                .html()
                .replace('<br>(Đã soát xét)', '')
                .replace('<br>(Đã kiểm toán)', '')
                .replace(' ', '_')
                .toLowerCase();

              if (period === 1) {
                // trường hợp lấy theo năm
                resultDataHeader.push(yearHeader);
              } else {
                // trường hợp lấy theo quý
                let arrayDataHeader = yearHeader.split('_');
                resultDataHeader.push({
                  year: parseInt(arrayDataHeader[1]),
                  quarter: parseInt(arrayDataHeader[0].replace('q', '')),
                });
              }
            }
          });

          let listData = $('tbody').find('tr');
          let listDataTable = [];
          listData.each(function (i, e) {
            listDataTable.push(`<table>${$(this).html()}</table>`);
          });

          let dataStock: any = await dbTvsi
            .get('value')
            .find({ code: stockCode })
            .cloneDeep()
            .value().data;

          await this.asyncForEach(listDataTable, async (data) => {
            let $2 = cheerio.load(data);
            let td = $2('td');
            let tdLabel = $2('td div.label');

            let index = field.findIndex(
              (item) => tdLabel.html() === item.label,
            );

            if (index > -1) {
              td.each(function (i, e) {
                if (i > 1) {
                  if (period === 1) {
                    let y = resultDataHeader[i - 2]; // yearCurrent
                    if (yearRange.indexOf(parseInt(y)) > -1) {
                      dataStock[y] = dataStock[y] ?? {
                        quarter: { q1: {}, q2: {}, q3: {}, q4: {} },
                      };
                      dataStock[y][field[index].field] = parseFloat(
                        $(this).html().replace(/,/g, ''),
                      );
                    }
                  } else {
                    let y = resultDataHeader[i - 2].year; // yearCurrent
                    let q = 'q' + resultDataHeader[i - 2].quarter; // yearCurrent
                    if (y === getOnlyYear && quarter.indexOf(q) !== -1) {
                      dataStock[y] = dataStock[y] ?? {};
                      dataStock[y].quarter = dataStock[y].quarter ?? {};
                      dataStock[y].quarter[q] = dataStock[y].quarter[q] ?? {};
                      dataStock[y].quarter[q][field[index].field] = parseFloat(
                        $(this).html().replace(/,/g, ''),
                      );
                    }
                  }
                }
              });
            }
          });

          if (iYear === 0 && period === 1) {
            dataStock[2021] = {
              quarter: { q1: {}, q2: {}, q3: {}, q4: {} },
            };
          }

          await dbTvsi
            .get('value')
            .find({ code: stockCode })
            .assign({ data: dataStock })
            .write();
        }
      }
    }
    // this.closeBrowser(p[1]);
    return true;
    // });
  }

  async calculateOtherIndicatorsQuarter(
    stockCode: string,
    year: number,
    listQuarter: string[],
  ): Promise<any> {
    let dataStock: any = await dbTvsi
      .get('value')
      .find({ code: stockCode })
      .cloneDeep()
      .value().data;
    await this.asyncForEach(listQuarter, async (quarter) => {
      let dataSave: any = await dbTvsi
        .get('value')
        .find({ code: stockCode })
        .cloneDeep()
        .value().data[year].quarter[quarter];
      if (
        dataSave?.loi_nhuan_sau_thue &&
        dataSave?.von_chu_so_huu &&
        dataSave?.no_dai_han
      ) {
        dataSave['roic'] =
          (dataSave.loi_nhuan_sau_thue /
            (dataSave.von_chu_so_huu + dataSave.no_dai_han)) *
          100;
      }
      if (dataSave?.doanh_so && dataSave?.tai_san) {
        dataSave['effectiveness'] = dataSave.doanh_so / dataSave.tai_san;
      }
      if (dataSave?.loi_nhuan_sau_thue && dataSave?.doanh_so) {
        dataSave['effciency'] =
          (dataSave.loi_nhuan_sau_thue / dataSave.doanh_so) * 100;
      }
      if (dataSave?.luu_chuyen_tien_te && dataSave?.loi_nhuan_sau_thue) {
        dataSave['productitivty'] =
          dataSave.luu_chuyen_tien_te / dataSave.loi_nhuan_sau_thue;
      }
      dataStock[year].quarter[quarter] = dataSave;
    });
    await dbTvsi
      .get('value')
      .find({ code: stockCode })
      .assign({ data: dataStock })
      .write();
    return true;
  }

  async calculateOtherIndicatorsYear(
    stockCode: string,
    listYear: number[],
  ): Promise<any> {
    let dataStock: any = await dbTvsi
      .get('value')
      .find({ code: stockCode })
      .cloneDeep()
      .value().data;

    await this.asyncForEach(listYear, async (year) => {
      let dataSave: any = await dbTvsi
        .get('value')
        .find({ code: stockCode })
        .cloneDeep()
        .value().data[year];

      if (
        dataSave?.loi_nhuan_sau_thue &&
        dataSave?.von_chu_so_huu &&
        dataSave?.no_dai_han
      ) {
        dataSave['roic'] =
          (dataSave.loi_nhuan_sau_thue /
            (dataSave.von_chu_so_huu + dataSave.no_dai_han)) *
          100;
      }
      if (dataSave?.doanh_so && dataSave?.tai_san) {
        dataSave['effectiveness'] = dataSave.doanh_so / dataSave.tai_san;
      }
      if (dataSave?.loi_nhuan_sau_thue && dataSave?.doanh_so) {
        dataSave['effciency'] =
          (dataSave.loi_nhuan_sau_thue / dataSave.doanh_so) * 100;
      }
      if (dataSave?.luu_chuyen_tien_te && dataSave?.loi_nhuan_sau_thue) {
        dataSave['productitivty'] =
          dataSave.luu_chuyen_tien_te / dataSave.loi_nhuan_sau_thue;
      }
      dataStock[year] = dataSave;
    });
    await dbTvsi
      .get('value')
      .find({ code: stockCode })
      .assign({ data: dataStock })
      .write();
  }

  async crawlAllData(start: number, end: number): Promise<any> {
    let dataStock: any[] = await dbStock.get('stock').cloneDeep().value();
    let listYear: number[] = [
      2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011,
    ];

    let arr = dataStock.filter((stock) => stock.branch);
    let total = arr.length;

    let i = 0;
    await this.newPage();
    await this.asyncForEach(arr, async (stock) => {
      if (stock.branch && i >= start && i < end) {
        adapterTvsi = new FileSync(`src/database/tvsi/${stock.code}.json`);
        dbTvsi = low(adapterTvsi);

        await dbTvsi.defaults({ value: [] }).write();

        await dbTvsi
          .get('value')
          .remove((stock) => stock)
          .write();

        console.log(i, '/', total + ': ', stock.code + ': ', stock.company);

        await dbTvsi
          .get('value')
          .push({ ...stock, data: {} })
          .write();
        await this.crawlDataYear(listYear, stock.code);

        console.log('crawl quarter');
        await this.asyncForEach(listYear, async (year) => {
          await this.crawlDataQuarter(
            year,
            ['q1', 'q2', 'q3', 'q4'],
            stock.code,
          );
        });

        console.log('calculate quarter');
        await this.asyncForEach(listYear, async (year) => {
          await this.calculateOtherIndicatorsQuarter(stock.code, year, [
            'q1',
            'q2',
            'q3',
            'q4',
          ]);
        });

        console.log('calculate year');

        await this.calculateOtherIndicatorsYear(stock.code, listYear);
      }
      i++;
    });
    await this.closeBrowser(this.browser);
    return true;
  }

  createData4M(proportion: number[], yearStart: number, yearEnd: number) {}

  test() {
    var todayDate = new Date().toISOString().slice(0, 10);
    this.httpService
      .get(
        `https://api4.fialda.com/api/services/app/StockInfo/GetTradingChartData?symbol=MSN&interval=1m&fromTime=${todayDate}T08:45:00.000&toTime=${todayDate}T15:00:00.000`,
      )
      .pipe()
      .subscribe((resp) => {
        console.log(resp.data.result[0].lastPrice);
      });
  }

  async getPriceStock(stockCode: string): Promise<any> {
    let todayDate = new Date().toISOString().slice(0, 10);
    let resp = await this.httpService
      .get(
        `https://api4.fialda.com/api/services/app/StockInfo/GetTradingChartData?symbol=${stockCode}&interval=1m&fromTime=${todayDate}T08:45:00.000&toTime=${todayDate}T15:00:00.000`,
      )
      .toPromise();
    let resp2 = await this.httpService
      .get(
        `https://api5.fialda.com/api/services/app/StockInfo/GetTradingData_LastDay?symbol=${stockCode}`,
      )
      .toPromise();
    let priceLast = resp.data.result[0]?.lastPrice;

    return priceLast ? priceLast : resp2.data.result.lastPrice;
  }

  async getValue(startYear, endYear, stockCode): Promise<any> {
    let adapterGetStock = new FileSync(`src/database/tvsi/${stockCode}.json`);
    let dbGetStock = low(adapterGetStock);
    let dataStock = await dbGetStock
      .get('value')
      .find({ code: stockCode })
      .cloneDeep()
      .value();

    for (const key in dataStock.data) {
      if (key < startYear || key > endYear) {
        delete dataStock.data[key];
      } else {
        delete dataStock.data[key].quarter;
      }
    }
    return dataStock;
  }

  async get4M(
    endYear: number,
    stockCode: string,
    listPercent: any,
  ): Promise<any> {
    let listValue = [
      'doanh_so',
      'eps',
      'bvps',
      'luu_chuyen_tien_te',
      'no_loi_nhuan',
      'effectiveness',
      'effciency',
      'productitivty',
      'roa',
      'roe',
      'roic',
    ];
    let adapterGetStock = new FileSync(`src/database/tvsi/${stockCode}.json`);
    let dbGetStock = low(adapterGetStock);
    let dataStock = await dbGetStock
      .get('value')
      .find({ code: stockCode })
      .cloneDeep()
      .value().data;

    let resp: any = {
      doanh_so: [],
      eps: [],
      bvps: [],
      luu_chuyen_tien_te: [],
      no_loi_nhuan: [],
      effectiveness: [],
      effciency: [],
      productitivty: [],
      roa: [],
      roe: [],
      roic: [],
    };
    for (const year of listPercent) {
      for (const key of listValue) {
        if (key !== 'no_loi_nhuan') {
          let percent = this.rate(
            year.range,
            0,
            -dataStock[endYear - year.range][key],
            dataStock[endYear][key],
          );
          resp[key].push(percent * 100);
        }
      }
    }
    resp.no_loi_nhuan.push(dataStock[endYear].no_dai_han);
    resp.no_loi_nhuan.push(dataStock[endYear].loi_nhuan_sau_thue);

    return resp;
  }

  async getCanslim(stockCode: string): Promise<any> {
    let adapterGetStock = new FileSync(`src/database/tvsi/${stockCode}.json`);
    let dbGetStock = low(adapterGetStock);
    let dataStock = await dbGetStock
      .get('value')
      .find({ code: stockCode })
      .cloneDeep()
      .value().data;

    let countQuarter = 1;
    let d = new Date();
    let currentYear = d.getFullYear();
    let startGet = false;
    let resp = {
      doanh_so: [],
      eps: [],
    };
    for (let year = currentYear; year > 2010; year--) {
      if (dataStock[year]) {
        if (countQuarter > 9) {
          break;
        } else {
          let listQuarter = dataStock[year].quarter;
          for (let i = 4; i > 0; i--) {
            if (listQuarter[`q${i}`]?.doanh_so && listQuarter[`q${i}`]?.eps) {
              startGet = true;
              resp.doanh_so.push({
                year: year,
                quarter: i,
                value: listQuarter[`q${i}`].doanh_so,
              });
              resp.eps.push({
                year: year,
                quarter: i,
                value: listQuarter[`q${i}`].loi_nhuan_sau_thue,
              });
            }
            if (startGet) {
              countQuarter++;
              if (countQuarter > 9) {
                break;
              }
            }
          }
        }
      }
    }
    return resp;
  }

  async update21(): Promise<any> {
    let dataStock: any[] = await dbStock.get('stock').cloneDeep().value();

    let arr = dataStock.filter((stock) => stock.branch);
    let i = 0;
    await this.asyncForEach(arr, async (stock) => {
      if (i >= 5 && i < 10) {
        await this.setupCrawlDataYear([2021], stock.code);
        await this.setupCrawlDataQuarter(2021, ['q1'], stock.code);
      }
      i++;
      return true;
    });
  }

  calculate4M(
    data: any,
    reference: any,
    proportion: any,
    percent_list: any,
  ): number {
    let scores = 0;
    let total_3_value = 0;
    for (const key in data) {
      if (key !== 'no_loi_nhuan') {
        let total_percent = 0;
        for (const [index, percent] of data[key].entries()) {
          if (percent > reference[key]) {
            total_percent += percent_list[index].percent;
          } else {
            let percent_calculate =
              (percent / reference[key]) * percent_list[index].percent;
            total_percent += percent_calculate > 0 ? percent_calculate : 0;
          }
        }
        if (
          key === 'effectiveness' ||
          key === 'effciency' ||
          key === 'productitivty'
        ) {
          total_3_value += total_percent;
        } else {
          scores += total_percent * (proportion[key] / 100);
        }
      } else {
        let total_percent =
          data[key][0] < reference[key] * data[key][1] ? proportion[key] : 0;
        scores += total_percent;
      }
    }
    scores += total_3_value * (proportion['effectiveness'] / 100);

    return scores;
  }

  async filter4M(
    endYear: number,
    rangePoint: number[],
    reference: any,
    percent: any,
    proportion: any,
  ): Promise<any> {
    let dataStock: any[] = await dbStock.get('stock').cloneDeep().value();
    let arr = dataStock.filter((stock) => stock.branch);

    let i = 0;
    let count = 0;
    let resp = [];
    await this.asyncForEach(arr, async (stock) => {
      if (i >= 0 && i < arr.length) {
        let data = await this.get4M(endYear, stock.code, percent);

        let check = this.checkNull(data);
        if (check) {
          count++;
          let scores = this.calculate4M(data, reference, proportion, percent);
          if (scores >= rangePoint[0] && scores <= rangePoint[1]) {
            resp.push({
              data: stock,
              scores: scores,
            });
          }
        }
      }
      i++;
    });
    return resp;
  }

  checkNull(data: any) {
    let status = true;
    for (const key in data) {
      for (const percent of data[key]) {
        if (percent === 1 || !percent) {
          status = false;
          break;
        }
      }
      if (!status) {
        break;
      }
    }
    return status;
  }

  async filterCanslim(
    rangePoint: number[],
    reference: any,
    proportion: any,
  ): Promise<any> {
    let dataStock: any[] = await dbStock.get('stock').cloneDeep().value();
    let arr = dataStock.filter((stock) => stock.branch);

    let i = 0;
    let resp = [];
    await this.asyncForEach(arr, async (stock) => {
      if (i >= 0 && i < arr.length) {
        let data = await this.getCanslim(stock.code);
        if (this.checkNullCanslim(data)) {
          let scores = this.calculateCanslim(data, reference, proportion);
          if (scores >= rangePoint[0] && scores <= rangePoint[1]) {
            resp.push({
              data: stock,
              scores: scores,
            });
          }
        }
      }
      i++;
    });
    return resp;
  }

  calculateCanslim(data: any, reference: any, proportion: any): number {
    let total = 0;
    for (const key in data) {
      let percent_row1 = data[key][0].value / data[key][4].value - 1;

      let scores_row1 =
        percent_row1 * 100 >= reference[key][0]
          ? proportion[key][0]
          : (percent_row1 / reference[key][0]) * proportion[key][0] * 100;
      total += scores_row1 > 0 ? scores_row1 : 0;

      let percent_row2 = data[key][1].value / data[key][5].value - 1;
      let scores_row2 =
        percent_row2 * 100 >= reference[key][1]
          ? proportion[key][1]
          : (percent_row2 / reference[key][1]) * proportion[key][1] * 100;
      total += scores_row2 > 0 ? scores_row2 : 0;

      let percent_row3 =
        (data[key][0].value +
          data[key][1].value +
          data[key][2].value +
          data[key][3].value) /
          (data[key][4].value +
            data[key][5].value +
            data[key][6].value +
            data[key][7].value) -
        1;
      let scores_row3 =
        percent_row3 * 100 >= reference[key][2]
          ? proportion[key][2]
          : (percent_row3 / reference[key][2]) * proportion[key][2] * 100;
      total += scores_row3 > 0 ? scores_row3 : 0;

      let percent_row4 =
        (data[key][1].value +
          data[key][2].value +
          data[key][3].value +
          data[key][4].value) /
          (data[key][5].value +
            data[key][6].value +
            data[key][7].value +
            data[key][8].value) -
        1;
      let scores_row4 =
        percent_row4 * 100 >= reference[key][3]
          ? proportion[key][3]
          : (percent_row4 / reference[key][3]) * proportion[key][3] * 100;
      total += scores_row4 > 0 ? scores_row4 : 0;
    }
    return total;
  }

  checkNullCanslim(data: any): boolean {
    if (data.doanh_so?.length === 9 && data.eps?.length === 9) {
      return true;
    } else {
      return false;
    }
  }

  async getChartData(stockCode: string): Promise<any> {
    let adapterGetStock = new FileSync(`src/database/tvsi/${stockCode}.json`);
    let dbGetStock = low(adapterGetStock);
    let dataStock = await dbGetStock
      .get('value')
      .find({ code: stockCode })
      .cloneDeep()
      .value().data;

    // for (let year = 2011; year < 2022; year++) {
    //   if (year < start || year > end) {
    //     console.log(year);

    //     delete dataStock[year];
    //   }
    // }

    // console.log(dataStock);

    let resp = {
      doanh_so: [],
      eps: [],
      bvps: [],
      luu_chuyen_tien_te: [],
      effectiveness: [],
      effciency: [],
      productitivty: [],
      roa: [],
      roe: [],
      roic: [],
    };

    for (const key in resp) {
      for (const year in dataStock) {
        for (const quarter in dataStock[year].quarter) {
          let time = `${quarter} - ${year}`;
          if (
            time !== 'q2 - 2021' &&
            time !== 'q3 - 2021' &&
            time !== 'q4 - 2021'
          ) {
            resp[key].push({
              time: time,
              value: dataStock[year]?.quarter[quarter][key],
              stock: stockCode,
              year: parseInt(year),
            });
          }
        }
      }
    }
    // console.log(resp);

    return resp;
  }

  async getChart4M(
    listStockCode: string[],
    endYear: number,
    reference: any,
    percent: any,
    proportion: any,
  ): Promise<any> {
    let resp = [];
    let dataStock: any[] = await dbStock.get('stock').cloneDeep().value();
    let arr = dataStock.filter((stock) => stock.branch);
    await this.asyncForEach(arr, async (stock) => {
      if (listStockCode.indexOf(stock.code) !== -1) {
        let data = await this.get4M(endYear, stock.code, percent);
        if (this.checkNull(data)) {
          let scores = this.calculate4M(data, reference, proportion, percent);
          resp.push({
            scores: Math.round(scores * 100) / 100,
            stock: stock.code,
            company: stock.company,
          });
        }
      }
    });
    return resp;
  }

  async getChartCanslim(
    listStockCode: string[],
    reference: any,
    proportion: any,
  ): Promise<any> {
    let resp = [];
    let dataStock: any[] = await dbStock.get('stock').cloneDeep().value();
    let arr = dataStock.filter((stock) => stock.branch);
    await this.asyncForEach(arr, async (stock) => {
      if (listStockCode.indexOf(stock.code) !== -1) {
        let data = await this.getCanslim(stock.code);
        if (this.checkNullCanslim(data)) {
          let scores = this.calculateCanslim(data, reference, proportion);
          resp.push({
            scores: Math.round(scores * 100) / 100,
            stock: stock.code,
            company: stock.company,
          });
        }
      }
    });
    return resp;
  }

  rate(
    periods: number,
    payment: number,
    present: number,
    future: number,
    type = undefined,
    guess = undefined,
  ) {
    guess = guess === undefined ? 0.01 : guess;
    future = future === undefined ? 0 : future;
    type = type === undefined ? 0 : type;

    // Set maximum epsilon for end of iteration
    var epsMax = 1e-10;

    // Set maximum number of iterations
    var iterMax = 10;

    // Implement Newton's method
    var y,
      y0,
      y1,
      x0,
      x1 = 0,
      f = 0,
      i = 0;
    var rate = guess;
    if (Math.abs(rate) < epsMax) {
      y =
        present * (1 + periods * rate) +
        payment * (1 + rate * type) * periods +
        future;
    } else {
      f = Math.exp(periods * Math.log(1 + rate));
      y = present * f + payment * (1 / rate + type) * (f - 1) + future;
    }
    y0 = present + payment * periods + future;
    y1 = present * f + payment * (1 / rate + type) * (f - 1) + future;
    i = x0 = 0;
    x1 = rate;
    while (Math.abs(y0 - y1) > epsMax && i < iterMax) {
      rate = (y1 * x0 - y0 * x1) / (y1 - y0);
      x0 = x1;
      x1 = rate;
      if (Math.abs(rate) < epsMax) {
        y =
          present * (1 + periods * rate) +
          payment * (1 + rate * type) * periods +
          future;
      } else {
        f = Math.exp(periods * Math.log(1 + rate));
        y = present * f + payment * (1 / rate + type) * (f - 1) + future;
      }
      y0 = y1;
      y1 = y;
      ++i;
    }
    return rate;
  }

  async asyncForEach(array, callback) {
    for (let index = 0; index < array.length; index++) {
      await callback(array[index], index, array);
    }
  }
}
