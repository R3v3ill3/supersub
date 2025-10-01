import { google } from 'googleapis';
import type { docs_v1, drive_v3 } from 'googleapis';
import { retryService } from './retryService';
import { errorHandler, ErrorType, ErrorCode } from './errorHandler';

type DocumentPlaceholders = {
  applicant_name: string;
  applicant_email: string;
  site_address: string;
  application_number: string;
  submission_date: string;
  submission_body: string;
  [key: string]: string;
};

type DocumentResult = {
  documentId: string;
  editUrl: string;
  viewUrl: string;
};

export class GoogleDocsService {
  private docs: docs_v1.Docs;
  private drive: drive_v3.Drive;

  constructor() {
    // Initialize Google APIs with service account credentials
    const credentials = this.getCredentials();
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: [
        'https://www.googleapis.com/auth/documents',
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/drive.file'
      ]
    });

    this.docs = google.docs({ version: 'v1', auth });
    this.drive = google.drive({ version: 'v3', auth });
  }

  /**
   * Export a Google Doc as plain text for analysis
   */
  async exportToText(documentId: string): Promise<string> {
    return retryService.executeWithRetry(
      async () => {
        const response = await this.drive.files.export({
          fileId: documentId,
          mimeType: 'text/plain'
        }, {
          responseType: 'stream'
        });

        const chunks: Buffer[] = [];
        return new Promise<string>((resolve, reject) => {
          response.data.on('data', (chunk: Buffer) => chunks.push(chunk));
          response.data.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
          response.data.on('error', reject);
        });
      },
      {
        operationName: 'google_docs_export_text',
        retryConfig: {
          maxRetries: 3,
          initialDelayMs: 1000,
          maxDelayMs: 10000
        },
        errorContext: {
          operation: 'export_document_to_text',
          metadata: { documentId }
        }
      }
    );
  }

  private getCredentials() {
    const credentialsJson = process.env.GOOGLE_CREDENTIALS_JSON;
    if (!credentialsJson) {
      throw new Error('GOOGLE_CREDENTIALS_JSON environment variable is required');
    }
    
    try {
      return JSON.parse(credentialsJson);
    } catch (error) {
      throw new Error('Invalid JSON in GOOGLE_CREDENTIALS_JSON');
    }
  }

  /**
   * Copy a template document and replace placeholders with actual values
   */
  async createDocumentFromTemplate(
    templateId: string,
    placeholders: DocumentPlaceholders,
    title: string
  ): Promise<DocumentResult> {
    return retryService.executeWithRetry(
      async () => {
        // 1. Copy the template document
        const parents = process.env.GOOGLE_DRIVE_FOLDER_ID ? [process.env.GOOGLE_DRIVE_FOLDER_ID] : undefined;
        const copyResponse = await this.drive.files.copy({
          fileId: templateId,
          requestBody: {
            name: title,
            parents // Optional: specify folder
          }
        });

        const newDocId = copyResponse.data.id!;

        // 2. Replace placeholders in the copied document
        await this.replacePlaceholders(newDocId, placeholders);

        // 3. Set permissions for the document (make it editable by anyone with link)
        await this.drive.permissions.create({
          fileId: newDocId,
          requestBody: {
            role: 'writer',
            type: 'anyone'
          }
        });

        // 4. Generate URLs
        const editUrl = `https://docs.google.com/document/d/${newDocId}/edit`;
        const viewUrl = `https://docs.google.com/document/d/${newDocId}/view`;

        return {
          documentId: newDocId,
          editUrl,
          viewUrl
        };
      },
      {
        operationName: 'google_docs_create_from_template',
        retryConfig: {
          maxRetries: 3,
          initialDelayMs: 2000,
          maxDelayMs: 15000
        },
        errorContext: {
          operation: 'create_document_from_template',
          metadata: { templateId, title }
        }
      }
    );
  }

  /**
   * Replace placeholders in a document with actual values
   */
  private async replacePlaceholders(documentId: string, placeholders: DocumentPlaceholders): Promise<void> {
    const requests: docs_v1.Schema$Request[] = [];

    // Create replacement requests for each placeholder
    for (const [key, value] of Object.entries(placeholders)) {
      const placeholder = `{{${key}}}`;
      requests.push({
        replaceAllText: {
          containsText: {
            text: placeholder,
            matchCase: false
          },
          replaceText: value || ''
        }
      });
    }

    if (requests.length > 0) {
      await retryService.executeWithRetry(
        () => this.docs.documents.batchUpdate({
          documentId,
          requestBody: {
            requests
          }
        }),
        {
          operationName: 'google_docs_replace_placeholders',
          retryConfig: {
            maxRetries: 2,
            initialDelayMs: 1000,
            maxDelayMs: 5000
          },
          errorContext: {
            operation: 'replace_document_placeholders',
            metadata: { documentId, placeholderCount: requests.length }
          }
        }
      );
    }
  }

  /**
   * Export a Google Doc as PDF
   */
  async exportToPdf(documentId: string): Promise<Buffer> {
    return retryService.executeWithRetry(
      async () => {
        const response = await this.drive.files.export({
          fileId: documentId,
          mimeType: 'application/pdf'
        }, {
          responseType: 'stream'
        });

        const chunks: Buffer[] = [];
        return new Promise<Buffer>((resolve, reject) => {
          response.data.on('data', (chunk: Buffer) => {
            chunks.push(chunk);
          });
          
          response.data.on('end', () => {
            resolve(Buffer.concat(chunks));
          });
          
          response.data.on('error', reject);
        });
      },
      {
        operationName: 'google_docs_export_pdf',
        retryConfig: {
          maxRetries: 3,
          initialDelayMs: 2000,
          maxDelayMs: 15000
        },
        errorContext: {
          operation: 'export_document_to_pdf',
          metadata: { documentId }
        }
      }
    );
  }

  /**
   * Upload PDF to Google Drive and get shareable link
   */
  async uploadPdfToDrive(pdfBuffer: Buffer, fileName: string): Promise<{ fileId: string; url: string }> {
    return retryService.executeWithRetry(
      async () => {
        const parents = process.env.GOOGLE_DRIVE_FOLDER_ID ? [process.env.GOOGLE_DRIVE_FOLDER_ID] : undefined;
        const response = await this.drive.files.create({
          requestBody: {
            name: fileName,
            parents // Optional: specify folder
          },
          media: {
            mimeType: 'application/pdf',
            body: pdfBuffer
          }
        });

        const fileId = response.data.id!;

        // Make the PDF viewable by anyone with the link
        await this.drive.permissions.create({
          fileId,
          requestBody: {
            role: 'reader',
            type: 'anyone'
          }
        });

        const url = `https://drive.google.com/file/d/${fileId}/view`;

        return { fileId, url };
      },
      {
        operationName: 'google_drive_upload_pdf',
        retryConfig: {
          maxRetries: 3,
          initialDelayMs: 2000,
          maxDelayMs: 15000
        },
        errorContext: {
          operation: 'upload_pdf_to_drive',
          metadata: { fileName, sizeBytes: pdfBuffer.length }
        }
      }
    );
  }

  /**
   * Create a complete document workflow: copy template, replace placeholders, export PDF
   */
  async createSubmissionDocument(
    templateId: string,
    placeholders: DocumentPlaceholders,
    title: string
  ): Promise<{
    documentId: string;
    editUrl: string;
    viewUrl: string;
    pdfUrl: string;
    pdfFileId: string;
  }> {
    // Create the document from template
    const docResult = await this.createDocumentFromTemplate(templateId, placeholders, title);

    // Export to PDF
    const pdfBuffer = await this.exportToPdf(docResult.documentId);
    const pdfFileName = `${title}.pdf`;
    const pdfResult = await this.uploadPdfToDrive(pdfBuffer, pdfFileName);

    return {
      ...docResult,
      pdfUrl: pdfResult.url,
      pdfFileId: pdfResult.fileId
    };
  }

  /**
   * Create a blank Google Doc with submission content (no template required)
   */
  async createBlankDocument(
    title: string,
    placeholders: DocumentPlaceholders,
    content: string
  ): Promise<{
    documentId: string;
    editUrl: string;
    viewUrl: string;
    pdfUrl: string;
    pdfFileId: string;
  }> {
    return retryService.executeWithRetry(
      async () => {
        // 1. Create a blank Google Doc
        const parents = process.env.GOOGLE_DRIVE_FOLDER_ID ? [process.env.GOOGLE_DRIVE_FOLDER_ID] : undefined;
        const createResponse = await this.docs.documents.create({
          requestBody: {
            title
          }
        });

        const newDocId = createResponse.data.documentId!;

        // 2. Build document content with submission details
        const documentContent = `Development Application Submission

Property Address: ${placeholders.site_address}
Application Number: ${placeholders.application_number}
Submission Date: ${placeholders.submission_date}

Submitter Details:
Name: ${placeholders.applicant_name}
Email: ${placeholders.applicant_email}

Council: ${placeholders.council_name}

---

Grounds for Submission:

${content}

---

This submission was generated by ${placeholders.project_name}.
`;

        // 3. Insert the content into the document
        await this.docs.documents.batchUpdate({
          documentId: newDocId,
          requestBody: {
            requests: [{
              insertText: {
                location: {
                  index: 1
                },
                text: documentContent
              }
            }]
          }
        });

        // 4. Set permissions (make it editable by anyone with link)
        await this.drive.permissions.create({
          fileId: newDocId,
          requestBody: {
            role: 'writer',
            type: 'anyone'
          }
        });

        // 5. Move to specified folder if configured
        if (parents && parents.length > 0) {
          await this.drive.files.update({
            fileId: newDocId,
            addParents: parents.join(','),
            fields: 'id, parents'
          });
        }

        // 6. Export to PDF
        const pdfBuffer = await this.exportToPdf(newDocId);

        // 7. Upload PDF to Drive
        const pdfResult = await this.uploadPdfToDrive(pdfBuffer, `${title}.pdf`);

        return {
          documentId: newDocId,
          editUrl: `https://docs.google.com/document/d/${newDocId}/edit`,
          viewUrl: `https://docs.google.com/document/d/${newDocId}/preview`,
          pdfUrl: pdfResult.url,
          pdfFileId: pdfResult.fileId
        };
      },
      {
        operationName: 'google_docs_create_blank_document',
        retryConfig: {
          maxRetries: 2,
          initialDelayMs: 1000
        },
        errorContext: {
          operation: 'create_blank_document',
          metadata: { title }
        }
      }
    );
  }
}
