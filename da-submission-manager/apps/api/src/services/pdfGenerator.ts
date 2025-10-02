import PDFDocument from 'pdfkit';
import { Logger } from '../lib/logger';

const logger = new Logger({ namespace: 'pdfGenerator' });

export class PdfGeneratorService {
  /**
   * Convert markdown content to PDF using PDFKit
   * Professional formatting with proper typography
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
          },
          bufferPages: true // Enable for page numbering
        });

        const chunks: Buffer[] = [];
        
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(chunks);
          logger.info('PDF generated successfully', { 
            size: pdfBuffer.length,
            pages: doc.bufferedPageRange().count 
          });
          resolve(pdfBuffer);
        });
        doc.on('error', reject);

        // Add title with better spacing
        doc.fontSize(20)
           .font('Helvetica-Bold')
           .text(title, { align: 'center' });
        
        doc.moveDown(1.5);
        
        // Add a subtle line separator
        doc.moveTo(doc.page.margins.left + 100, doc.y)
           .lineTo(doc.page.width - doc.page.margins.right - 100, doc.y)
           .lineWidth(0.5)
           .stroke();
        
        doc.moveDown(1.5);

        // Normalize content for PDF-safe characters and process line by line
        // Trim excessive trailing whitespace to prevent blank pages
        const normalizedContent = this.normalizeContent(content.trimEnd());
        const lines = normalizedContent.split('\n');
        let inList = false;
        let previousWasHeading = false;
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const trimmed = line.trim();
          
          // Check if we need a new page (leave room for at least 3 lines)
          if (doc.y > doc.page.height - doc.page.margins.bottom - 100) {
            doc.addPage();
            previousWasHeading = false;
          }
          
          if (!trimmed) {
            // Empty line - add spacing (more after headings)
            doc.moveDown(previousWasHeading ? 0.5 : 0.4);
            inList = false;
            previousWasHeading = false;
            continue;
          }

          // Level 1 Headings (# )
          if (trimmed.startsWith('# ')) {
            if (i > 0) doc.moveDown(0.8); // Extra space before heading
            doc.fontSize(18).font('Helvetica-Bold').text(trimmed.substring(2));
            doc.moveDown(0.5);
            inList = false;
            previousWasHeading = true;
          } 
          // Level 2 Headings (## )
          else if (trimmed.startsWith('## ')) {
            if (i > 0) doc.moveDown(0.7);
            doc.fontSize(15).font('Helvetica-Bold').text(trimmed.substring(3));
            doc.moveDown(0.4);
            inList = false;
            previousWasHeading = true;
          } 
          // Level 3 Headings (### )
          else if (trimmed.startsWith('### ')) {
            if (i > 0) doc.moveDown(0.5);
            doc.fontSize(13).font('Helvetica-Bold').text(trimmed.substring(4));
            doc.moveDown(0.3);
            inList = false;
            previousWasHeading = true;
          }
          // Level 4 Headings (#### )
          else if (trimmed.startsWith('#### ')) {
            if (i > 0) doc.moveDown(0.4);
            doc.fontSize(12).font('Helvetica-Bold').text(trimmed.substring(5));
            doc.moveDown(0.2);
            inList = false;
            previousWasHeading = true;
          }
          // Horizontal rule
          else if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
            doc.moveDown(0.5);
            doc.moveTo(doc.page.margins.left, doc.y)
               .lineTo(doc.page.width - doc.page.margins.right, doc.y)
               .lineWidth(1)
               .stroke();
            doc.moveDown(0.5);
            inList = false;
            previousWasHeading = false;
          }
          // Bullet Lists (- or *)
          else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            if (!inList) {
              doc.moveDown(0.3);
            }
            this.renderFormattedText(doc, '• ' + trimmed.substring(2), {
              fontSize: 11,
              indent: 20,
              paragraphGap: 4,
              lineSpacing: 1.2
            });
            inList = true;
            previousWasHeading = false;
          }
          // Numbered lists (1. 2. etc)
          else if (/^\d+\.\s/.test(trimmed)) {
            if (!inList) {
              doc.moveDown(0.3);
            }
            this.renderFormattedText(doc, trimmed, {
              fontSize: 11,
              indent: 25,
              paragraphGap: 4,
              lineSpacing: 1.2
            });
            inList = true;
            previousWasHeading = false;
          }
          // Block quotes (> )
          else if (trimmed.startsWith('> ')) {
            doc.fontSize(10).font('Helvetica-Oblique');
            const quoteText = trimmed.substring(2);
            const x = doc.page.margins.left + 30;
            const startY = doc.y;
            
            doc.text(quoteText, x, startY, {
              width: doc.page.width - doc.page.margins.left - doc.page.margins.right - 30,
              lineGap: 2
            });
            
            // Draw quote line
            doc.moveTo(x - 15, startY)
               .lineTo(x - 15, doc.y)
               .lineWidth(2)
               .strokeColor('#999999')
               .stroke()
               .strokeColor('black'); // Reset to black
               
            doc.moveDown(0.4);
            inList = false;
            previousWasHeading = false;
          }
          // Normal paragraph
          else {
            if (inList) {
              doc.moveDown(0.4);
            }
            this.renderFormattedText(doc, trimmed, {
              fontSize: 11,
              align: 'left', // Changed from 'justify' for better readability
              paragraphGap: 6,
              lineSpacing: 1.3
            });
            inList = false;
            previousWasHeading = false;
          }
        }

        // Add page numbers
        const pageCount = doc.bufferedPageRange().count;
        for (let i = 0; i < pageCount; i++) {
          doc.switchToPage(i);
          doc.fontSize(9)
             .font('Helvetica')
             .text(
               `Page ${i + 1} of ${pageCount}`,
               doc.page.margins.left,
               doc.page.height - 50,
               { align: 'center', width: doc.page.width - doc.page.margins.left - doc.page.margins.right }
             );
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
    options: { fontSize?: number; indent?: number; align?: string; paragraphGap?: number; lineSpacing?: number } = {}
  ) {
    const fontSize = options.fontSize || 11;
    const indent = options.indent || 0;
    const align = options.align as any;
    const paragraphGap = options.paragraphGap || 5;
    const lineGap = options.lineSpacing ? (fontSize * (options.lineSpacing - 1)) : 2;

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
            align: continued ? undefined : align,
            lineGap
          });
        } else if (token.type === 'italic') {
          doc.font('Helvetica-Oblique').text(token.text, {
            continued: !isLast,
            indent: continued ? 0 : indent,
            align: continued ? undefined : align,
            lineGap
          });
        } else {
          doc.font('Helvetica').text(token.text, {
            continued: !isLast,
            indent: continued ? 0 : indent,
            align: continued ? undefined : align,
            lineGap
          });
        }
        continued = true;
      }
      doc.moveDown(paragraphGap / 10);
    } else {
      // Plain text
      doc.font('Helvetica').text(text, {
        indent,
        align,
        lineGap
      });
      doc.moveDown(paragraphGap / 10);
    }
  }

  /**
   * Normalize content to remove HTML entities and ensure PDF-safe characters
   */
  private normalizeContent(text: string): string {
    if (!text) return text;

    return text
      .replace(/&#x27;|&#39;|&#x2019;/g, "'")
      .replace(/&quot;|&#x201C;|&#x201D;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#x2013;|&#x2014;/g, '-')
      .replace(/&#x2022;|&#8226;/g, '•')
      .replace(/&#160;|&#x00A0;/g, ' ')
      .replace(/&#x2026;/g, '...')
      .replace(/&nbsp;/g, ' ')
      .replace(/&rsquo;/g, "'")
      .replace(/&lsquo;/g, "'")
      .replace(/&ldquo;/g, '"')
      .replace(/&rdquo;/g, '"')
      // Checkbox characters - replace with text-based alternatives for better PDF rendering
      .replace(/&#x2610;|&#x25A1;|☐/g, '[ ]')  // Empty checkbox - text-based version
      .replace(/&#x2611;|&#9745;|☑/g, '[X]')  // Checked checkbox - text-based version
      .replace(/&#x00AD;/g, '')
      .replace(/&#x00B7;/g, '·')
      .replace(/&#x2212;/g, '-')
      .replace(/&#x2018;/g, "'")
      .replace(/&#x201A;/g, ',')
      .replace(/&#x2032;/g, "'")
      .replace(/&#x2033;/g, '"')
      // Remove excessive consecutive newlines (more than 3 in a row)
      .replace(/\n{4,}/g, '\n\n\n');
  }

  /**
   * Tokenize text into parts with formatting
   * Improved to handle edge cases and nested formatting
   */
  private tokenizeText(text: string): Array<{ type: 'normal' | 'bold' | 'italic'; text: string }> {
    const tokens: Array<{ type: 'normal' | 'bold' | 'italic'; text: string }> = [];
    let current = '';
    let i = 0;

    while (i < text.length) {
      // Check for bold **text**
      if (text[i] === '*' && text[i + 1] === '*') {
        // Save any accumulated normal text
        if (current) {
          tokens.push({ type: 'normal', text: current });
          current = '';
        }
        i += 2; // Skip opening **
        let boldText = '';
        // Find the closing **
        while (i < text.length) {
          if (text[i] === '*' && text[i + 1] === '*') {
            // Found closing **
            if (boldText) {
              tokens.push({ type: 'bold', text: boldText });
            }
            i += 2; // Skip closing **
            break;
          }
          boldText += text[i];
          i++;
        }
        // If we didn't find a closing **, treat the ** as literal text
        if (i >= text.length && boldText) {
          tokens.push({ type: 'normal', text: '**' + boldText });
        }
      }
      // Check for italic *text* (but not **)
      else if (text[i] === '*' && text[i + 1] !== '*') {
        // Save any accumulated normal text
        if (current) {
          tokens.push({ type: 'normal', text: current });
          current = '';
        }
        i++; // Skip opening *
        let italicText = '';
        // Find the closing *
        while (i < text.length) {
          if (text[i] === '*' && text[i + 1] !== '*') {
            // Found closing *
            if (italicText) {
              tokens.push({ type: 'italic', text: italicText });
            }
            i++; // Skip closing *
            break;
          }
          italicText += text[i];
          i++;
        }
        // If we didn't find a closing *, treat the * as literal text
        if (i >= text.length && italicText) {
          tokens.push({ type: 'normal', text: '*' + italicText });
        }
      }
      else {
        current += text[i];
        i++;
      }
    }

    // Add any remaining normal text
    if (current) {
      tokens.push({ type: 'normal', text: current });
    }

    return tokens;
  }
}

