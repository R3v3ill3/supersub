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

        // Process content line by line with better formatting
        const lines = content.split('\n');
        let inList = false;
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const trimmed = line.trim();
          
          if (!trimmed) {
            // Empty line - add spacing
            doc.moveDown(0.3);
            inList = false;
            continue;
          }

          // Headings
          if (trimmed.startsWith('# ')) {
            doc.moveDown(0.5);
            doc.fontSize(16).font('Helvetica-Bold').text(trimmed.substring(2));
            doc.moveDown(0.3);
            inList = false;
          } 
          else if (trimmed.startsWith('## ')) {
            doc.moveDown(0.4);
            doc.fontSize(14).font('Helvetica-Bold').text(trimmed.substring(3));
            doc.moveDown(0.2);
            inList = false;
          } 
          else if (trimmed.startsWith('### ')) {
            doc.moveDown(0.3);
            doc.fontSize(12).font('Helvetica-Bold').text(trimmed.substring(4));
            doc.moveDown(0.2);
            inList = false;
          }
          else if (trimmed.startsWith('#### ')) {
            doc.moveDown(0.2);
            doc.fontSize(11).font('Helvetica-Bold').text(trimmed.substring(5));
            doc.moveDown(0.1);
            inList = false;
          }
          // Horizontal rule
          else if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
            doc.moveDown(0.3);
            doc.moveTo(doc.page.margins.left, doc.y)
               .lineTo(doc.page.width - doc.page.margins.right, doc.y)
               .stroke();
            doc.moveDown(0.3);
            inList = false;
          }
          // Bullet Lists
          else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            if (!inList) {
              doc.moveDown(0.2);
            }
            this.renderFormattedText(doc, '• ' + trimmed.substring(2), {
              fontSize: 11,
              indent: 15,
              paragraphGap: 3
            });
            inList = true;
          }
          // Numbered lists
          else if (/^\d+\.\s/.test(trimmed)) {
            if (!inList) {
              doc.moveDown(0.2);
            }
            this.renderFormattedText(doc, trimmed, {
              fontSize: 11,
              indent: 20,
              paragraphGap: 3
            });
            inList = true;
          }
          // Block quotes
          else if (trimmed.startsWith('> ')) {
            doc.fontSize(10).font('Helvetica-Oblique');
            const quoteText = trimmed.substring(2);
            const x = doc.page.margins.left + 30;
            doc.moveTo(x - 15, doc.y)
               .lineTo(x - 15, doc.y + 20)
               .stroke();
            doc.text(quoteText, x, doc.y - 20, {
              width: doc.page.width - doc.page.margins.left - doc.page.margins.right - 30
            });
            doc.moveDown(0.3);
            inList = false;
          }
          // Normal paragraph
          else {
            if (inList) {
              doc.moveDown(0.3);
            }
            this.renderFormattedText(doc, trimmed, {
              fontSize: 11,
              align: 'justify',
              paragraphGap: 5
            });
            inList = false;
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

  /**
   * Render text with inline formatting (bold, italic)
   */
  private renderFormattedText(
    doc: PDFKit.PDFDocument, 
    text: string, 
    options: { fontSize?: number; indent?: number; align?: string; paragraphGap?: number } = {}
  ) {
    const fontSize = options.fontSize || 11;
    const indent = options.indent || 0;
    const align = options.align as any;
    const paragraphGap = options.paragraphGap || 5;

    doc.fontSize(fontSize);

    // Handle bold and italic inline formatting
    if (text.includes('**') || text.includes('*')) {
      const tokens = this.tokenizeText(text);
      let continued = false;

      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        const isLast = i === tokens.length - 1;

        if (token.type === 'bold') {
          doc.font('Helvetica-Bold').text(token.text, {
            continued: !isLast,
            indent: continued ? 0 : indent,
            align: continued ? undefined : align
          });
        } else if (token.type === 'italic') {
          doc.font('Helvetica-Oblique').text(token.text, {
            continued: !isLast,
            indent: continued ? 0 : indent,
            align: continued ? undefined : align
          });
        } else {
          doc.font('Helvetica').text(token.text, {
            continued: !isLast,
            indent: continued ? 0 : indent,
            align: continued ? undefined : align
          });
        }
        continued = true;
      }
      doc.moveDown(paragraphGap / 10);
    } else {
      // Plain text
      doc.font('Helvetica').text(text, {
        indent,
        align
      });
      doc.moveDown(paragraphGap / 10);
    }
  }

  /**
   * Tokenize text into parts with formatting
   */
  private tokenizeText(text: string): Array<{ type: 'normal' | 'bold' | 'italic'; text: string }> {
    const tokens: Array<{ type: 'normal' | 'bold' | 'italic'; text: string }> = [];
    let current = '';
    let i = 0;

    while (i < text.length) {
      // Check for bold **text**
      if (text[i] === '*' && text[i + 1] === '*') {
        if (current) {
          tokens.push({ type: 'normal', text: current });
          current = '';
        }
        i += 2;
        let boldText = '';
        while (i < text.length && !(text[i] === '*' && text[i + 1] === '*')) {
          boldText += text[i];
          i++;
        }
        if (boldText) {
          tokens.push({ type: 'bold', text: boldText });
        }
        i += 2; // Skip closing **
      }
      // Check for italic *text*
      else if (text[i] === '*') {
        if (current) {
          tokens.push({ type: 'normal', text: current });
          current = '';
        }
        i++;
        let italicText = '';
        while (i < text.length && text[i] !== '*') {
          italicText += text[i];
          i++;
        }
        if (italicText) {
          tokens.push({ type: 'italic', text: italicText });
        }
        i++; // Skip closing *
      }
      else {
        current += text[i];
        i++;
      }
    }

    if (current) {
      tokens.push({ type: 'normal', text: current });
    }

    return tokens;
  }
}

