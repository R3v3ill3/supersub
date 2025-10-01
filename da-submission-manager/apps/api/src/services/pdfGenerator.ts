import puppeteer from 'puppeteer';
import { marked } from 'marked';
import { Logger } from '../lib/logger';

const logger = new Logger({ namespace: 'pdfGenerator' });

export class PdfGeneratorService {
  /**
   * Convert markdown content to PDF
   */
  async generatePdfFromMarkdown(content: string, title: string): Promise<Buffer> {
    let browser;
    
    try {
      // Convert markdown to HTML
      const htmlContent = await marked(content);
      
      // Create full HTML document with styling
      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    @page {
      margin: 2cm;
      size: A4;
    }
    body {
      font-family: 'Georgia', 'Times New Roman', serif;
      font-size: 12pt;
      line-height: 1.6;
      color: #333;
      max-width: 100%;
      margin: 0;
      padding: 0;
    }
    h1 {
      font-size: 20pt;
      margin-top: 0;
      margin-bottom: 1em;
      color: #000;
      border-bottom: 2px solid #000;
      padding-bottom: 0.3em;
    }
    h2 {
      font-size: 16pt;
      margin-top: 1.5em;
      margin-bottom: 0.5em;
      color: #000;
    }
    h3 {
      font-size: 14pt;
      margin-top: 1em;
      margin-bottom: 0.5em;
      color: #000;
    }
    p {
      margin-bottom: 1em;
      text-align: justify;
    }
    ul, ol {
      margin-bottom: 1em;
      padding-left: 2em;
    }
    li {
      margin-bottom: 0.5em;
    }
    strong {
      font-weight: bold;
      color: #000;
    }
    em {
      font-style: italic;
    }
    a {
      color: #0066cc;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    blockquote {
      margin-left: 2em;
      padding-left: 1em;
      border-left: 3px solid #ccc;
      font-style: italic;
      color: #666;
    }
    hr {
      border: none;
      border-top: 1px solid #ccc;
      margin: 2em 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 1em;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
    }
    th {
      background-color: #f2f2f2;
      font-weight: bold;
    }
  </style>
</head>
<body>
  ${htmlContent}
</body>
</html>
`;

      // Launch puppeteer
      logger.info('Launching browser for PDF generation');
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-first-run',
          '--no-zygote',
          '--single-process'
        ]
      });

      const page = await browser.newPage();
      
      // Set content
      await page.setContent(html, {
        waitUntil: 'networkidle0'
      });

      // Generate PDF
      logger.info('Generating PDF');
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '2cm',
          right: '2cm',
          bottom: '2cm',
          left: '2cm'
        }
      });

      logger.info('PDF generated successfully', { size: pdfBuffer.length });
      return Buffer.from(pdfBuffer);

    } catch (error: any) {
      logger.error('Failed to generate PDF', { error: error.message });
      throw new Error(`PDF generation failed: ${error.message}`);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}

