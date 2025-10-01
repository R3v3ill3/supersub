import PDFDocument from 'pdfkit';
import { Logger } from '../lib/logger';

const logger = new Logger({ namespace: 'pdfGenerator' });

export class PdfGeneratorService {
  /**
   * Convert markdown content to PDF using PDFKit
   * Simple, lightweight, no Chrome needed
   */
  async generatePdfFromMarkdown(content: string, title: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: {
            top: 72,    // 1 inch = 72 points
            bottom: 72,
            left: 72,
            right: 72
          }
        });

        const chunks: Buffer[] = [];
        
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(chunks);
          logger.info('PDF generated successfully', { size: pdfBuffer.length });
          resolve(pdfBuffer);
        });
        doc.on('error', reject);

        // Add title
        doc.fontSize(18)
           .font('Helvetica-Bold')
           .text(title, { align: 'center' });
        
        doc.moveDown(2);

        // Process content line by line
        const lines = content.split('\n');
        
        for (const line of lines) {
          if (!line.trim()) {
            doc.moveDown(0.5);
            continue;
          }

          // Headings
          if (line.startsWith('# ')) {
            doc.fontSize(16).font('Helvetica-Bold').text(line.substring(2));
            doc.moveDown(0.5);
          } else if (line.startsWith('## ')) {
            doc.fontSize(14).font('Helvetica-Bold').text(line.substring(3));
            doc.moveDown(0.5);
          } else if (line.startsWith('### ')) {
            doc.fontSize(12).font('Helvetica-Bold').text(line.substring(4));
            doc.moveDown(0.5);
          } 
          // Lists
          else if (line.startsWith('- ') || line.startsWith('* ')) {
            doc.fontSize(11).font('Helvetica').text('• ' + line.substring(2), {
              indent: 20
            });
          }
          // Numbered lists
          else if (/^\d+\.\s/.test(line)) {
            doc.fontSize(11).font('Helvetica').text(line, {
              indent: 20
            });
          }
          // Horizontal rule
          else if (line.trim() === '---' || line.trim() === '***') {
            doc.moveDown(0.5);
            doc.moveTo(72, doc.y)
               .lineTo(doc.page.width - 72, doc.y)
               .stroke();
            doc.moveDown(0.5);
          }
          // Bold text (simple **text** pattern)
          else if (line.includes('**')) {
            doc.fontSize(11);
            const parts = line.split('**');
            for (let i = 0; i < parts.length; i++) {
              if (i % 2 === 0) {
                doc.font('Helvetica').text(parts[i], { continued: i < parts.length - 1 });
              } else {
                doc.font('Helvetica-Bold').text(parts[i], { continued: i < parts.length - 1 });
              }
            }
            doc.text(''); // End the line
          }
          // Normal paragraph
          else {
            doc.fontSize(11).font('Helvetica').text(line, {
              align: 'justify'
            });
          }
        }

        // Finalize PDF
        doc.end();

      } catch (error: any) {
        logger.error('Failed to generate PDF', { error: error.message });
        reject(new Error(`PDF generation failed: ${error.message}`));
      }
    });
  }
}

