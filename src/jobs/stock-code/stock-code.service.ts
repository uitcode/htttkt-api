import { Injectable } from '@nestjs/common';
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');

const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const adapter = new FileSync('src/database/database.json');
const db = low(adapter);

db.defaults({ stock: [] }).write();

@Injectable()
export class StockCodeService {
  async closeBrowser(browser) {
    await browser.close();
  }

  async newPage(): Promise<any> {
    const browser = await puppeteer.launch(
      // Setting optimal puppeteer
      {
        headless: false,
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
    return [page, browser];
  }

  async getStockCode(): Promise<any> {
    const browser = await puppeteer.launch(
      // Setting optimal puppeteer
      {
        headless: false,
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

    let url = `http://s.cafef.vn/du-lieu-doanh-nghiep.chn`;
    await page.goto(url, { timeout: 0 });
    const [button] = await page.$x(
      "//td[@id='CafeF_ThiTruongNiemYet_Trang']/a[contains(., 'Xem toàn bộ')]",
    );
    if (button) {
      await button.click();
    }
    var promise = new Promise(function (resolve, reject) {
      setTimeout(async () => {
        await page.waitForFunction(
          'document.querySelector("#CafeF_ThiTruongNiemYet_TongSoTrang").innerText.includes("Trang 1/1")',
        );

        let results = await page.evaluate(
          () =>
            document.querySelector('td#CafeF_ThiTruongNiemYet_Content table')
              .outerHTML,
        );
        let $ = cheerio.load(results);
        let listRows = $('tbody').find('tr');
        let arrListRows = [];
        listRows.each(function (i, e) {
          arrListRows.push(`<table>${$(this).html()}</table>`);
        });
        let dataResults: any[] = [];
        for (const [index, data] of arrListRows.entries()) {
          if (index > 0) {
            let $2 = cheerio.load(data);
            let td = $2('td');
            let objData: any = {};
            td.each(function (i, e) {
              if (i === 0) {
                objData.code = $(this).text();
              } else if (i === 1) {
                objData.url = $(this).find('a').attr('href');
                objData.company = $(this).text();
              } else if (i === 2) {
                objData.price = $(this).text()
                  ? parseInt($(this).text())
                  : null;
              } else if (i === 3) {
                objData.stock_exchange = $(this).text();
              }
            });
            dataResults.push(objData);
          }
        }
        resolve(dataResults);
      }, 2000);
    });
    return promise;
  }

  async saveDB(listStockCode: any[]): Promise<any> {
    await db
      .get('stock')
      .remove((stock) => stock)
      .write();

    await db
      .get('stock')
      .push(...listStockCode)
      .write();
  }

  async getAll(): Promise<any> {
    return db.get('stock').value();
  }

  async update(stockCode: string, page: any): Promise<any> {
    let url = `http://finance.tvsi.com.vn/Enterprises/FinancialStatements?symbol=${stockCode}`;
    await page.goto(url, { timeout: 0 });
    let data = await page.evaluate(() => document.querySelector('*').outerHTML);

    const pattern = /<script[^<]*<\/script>/g;
    let arr = Array.from(data.toString().matchAll(pattern))
      .map((x) => x[0])
      .filter((x) => !x.match('src'))
      .filter((x) => x.match('change_tab'));

    let regex = /tennganh = '(.+?)';/gi;
    let branch = null;
    if (arr[0]) {
      branch = arr[0].match(regex);
      branch = branch[0].replace(/tennganh = '(.+?)';/gi, '$1').trim();
    } else {
      arr[0];
    }
    return branch;
  }

  async getBranch(): Promise<any> {
    let listStock = await db.get('stock').value();
    await this.newPage().then(async (p) => {
      let page = p[0];
      for await (const [index, stock] of listStock.entries()) {
        await this.update(stock.code, page).then(async (branch) => {
          await db
            .get('stock')
            .find({ code: stock.code })
            .assign({ branch: branch })
            .write();
        });
      }
      this.closeBrowser(p[1]);
    });
  }
}
