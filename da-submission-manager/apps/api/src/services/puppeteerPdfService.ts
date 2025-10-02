import path from 'node:path';
import fs from 'node:fs/promises';
import puppeteer, { Browser } from 'puppeteer';
import { renderMarkdownToHtml } from '../utils/markdownRenderer';
import { Logger } from '../lib/logger';

export class PuppeteerPdfService {
  private browser: Browser | null = null;
  private readonly logger = new Logger({ namespace: 'PuppeteerPdfService' });
  private readonly cssPath = path.resolve(__dirname, '../pdf/templates/submission.css');

  async getBrowser(): Promise<Browser> {
    if (this.browser && this.browser.isConnected()) {
      return this.browser;
    }

    this.logger.info('Launching puppeteer browser for PDF generation');
    this.browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: 'new'
    });
    return this.browser;
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async generatePdfFromMarkdown(markdown: string, title: string): Promise<Buffer> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      const htmlContent = await renderMarkdownToHtml(markdown);
      const css = await fs.readFile(this.cssPath, 'utf-8');

      const html = `<!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="utf-8" />
            <title>${title}</title>
            <style>${css}</style>
          </head>
          <body>
            ${htmlContent}
            <div class="page-footer" id="footer">${title}</div>
          </body>
        </html>`;

      await page.setContent(html, { waitUntil: 'networkidle0' });

      const buffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        displayHeaderFooter: false,
        margin: {
          top: '25mm',
          bottom: '25mm',
          left: '20mm',
          right: '20mm'
        }
      });

      this.logger.info('Generated PDF using Puppeteer', { size: buffer.length });
      return buffer;
    } finally {
      await page.close();
    }
  }
}

