# PDF Generation Resource Exhaustion Issue - Root Cause Analysis

## Problem Summary

Users are experiencing **400 errors** during submission generation. The root cause is **server resource exhaustion** when attempting to generate PDFs with Puppeteer.

## Error Details

```
[documentWorkflow] Puppeteer PDF generation failed, falling back to pdfkit {
  error: 'Failed to launch the browser process: Code: null
  
  stderr:
  [1959:1959:1003/043759.089236:ERROR:base/threading/platform_thread_posix.cc:162] 
  pthread_create: Resource temporarily unavailable (11)
```

### What This Error Means

`pthread_create: Resource temporarily unavailable (11)` indicates:
- **The server has run out of system resources** (threads, memory, or process limits)
- **Chromium (used by Puppeteer) cannot launch** because it requires significant system resources
- **Each Puppeteer instance** creates multiple processes and threads

## Root Causes

### 1. **Browser Instance Leaks**
The `PuppeteerPdfService` is designed to reuse browser instances, but:
- Each request creates a **new instance** of `PuppeteerPdfService` 
- Browser instances may not be properly closed after use
- Under high load, multiple browser processes accumulate

**Location**: `apps/api/src/services/puppeteerPdfService.ts`

```typescript
export class PuppeteerPdfService {
  private browser: Browser | null = null;  // Instance variable

  async getBrowser(): Promise<Browser> {
    if (this.browser && this.browser.isConnected()) {
      return this.browser;
    }
    // Launches new browser if none exists
    this.browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: true
    });
    return this.browser;
  }
}
```

**Problem**: Each time `documentWorkflow.createFileFromMarkdown()` is called, it creates a **new instance** of `PuppeteerPdfService`, which doesn't share the browser with other instances.

**Location**: `apps/api/src/services/documentWorkflow.ts:1126`
```typescript
const puppeteerPdfService = new PuppeteerPdfService();  // NEW instance each time!
```

### 2. **No Global Browser Pool**
- Each service instance manages its own browser
- Under concurrent load, multiple browsers can be running simultaneously
- No limit on concurrent browser instances

### 3. **Insufficient Server Resources**
Railway/production server may have:
- Limited memory (Chromium requires ~500MB per instance)
- Limited process/thread limits
- CPU constraints under load

## Why It Causes 400 Errors

The error chain is:

1. User submits text → `/api/submissions/:submissionId/submit` (line 328)
2. Calls `documentWorkflow.processSubmission(submissionId, finalText, emailBody, downloadPdf)`
3. For "direct" pathway → `processDirectSubmission()` generates PDF
4. Calls `createFileFromMarkdown()` → Creates new PuppeteerPdfService
5. **Puppeteer fails to launch** → Falls back to pdfkit
6. **If pdfkit also has issues OR the error propagates**, it bubbles up
7. Error caught in route handler → Returns 400 with error message

## Solutions

### Immediate Fix (Priority 1): Disable Puppeteer or Use Singleton Pattern

#### Option A: Switch to PDFKit (Safest, Fastest)
Set environment variable to disable Puppeteer:

```bash
PDF_ENGINE=pdfkit
```

PDFKit uses far fewer resources and doesn't spawn browser processes.

#### Option B: Implement Browser Singleton
Create a shared browser pool instead of per-instance browsers.

### Short-term Fix (Priority 2): Add Resource Limits

1. **Limit concurrent PDF generations** - Add a queue/semaphore
2. **Add timeout and cleanup** - Ensure browsers are closed even on errors
3. **Increase server resources** - Scale up Railway instance

### Long-term Fix (Priority 3): Offload PDF Generation

1. **Use a dedicated PDF service** (like DocRaptor, PDFShift, or self-hosted Gotenberg)
2. **Queue-based processing** - Generate PDFs asynchronously
3. **Separate worker process** - Dedicated container for PDF generation

## Recommended Action Plan

### Phase 1: Immediate (Now)
```bash
# In Railway/Vercel environment variables
PDF_ENGINE=pdfkit
```

This will skip Puppeteer entirely and use the lightweight PDFKit library.

### Phase 2: Code Fix (Next Deploy)

**1. Convert PuppeteerPdfService to Singleton**

Create `apps/api/src/services/puppeteerPdfService.ts`:
```typescript
export class PuppeteerPdfService {
  private static instance: PuppeteerPdfService | null = null;
  private static browserPromise: Promise<Browser> | null = null;
  private browser: Browser | null = null;
  
  private constructor() {
    // Private constructor for singleton
  }
  
  static getInstance(): PuppeteerPdfService {
    if (!PuppeteerPdfService.instance) {
      PuppeteerPdfService.instance = new PuppeteerPdfService();
    }
    return PuppeteerPdfService.instance;
  }

  async getBrowser(): Promise<Browser> {
    // Only one browser launch at a time
    if (!PuppeteerPdfService.browserPromise) {
      PuppeteerPdfService.browserPromise = puppeteer.launch({
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',  // Reduce memory usage
          '--disable-gpu',
          '--single-process'  // Use single process (less resource intensive)
        ],
        headless: true
      });
    }
    
    this.browser = await PuppeteerPdfService.browserPromise;
    return this.browser;
  }

  async generatePdfFromMarkdown(markdown: string, title: string): Promise<Buffer> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();
    
    try {
      // Set resource limits
      await page.setDefaultTimeout(30000); // 30s timeout
      await page.setDefaultNavigationTimeout(30000);
      
      // ... rest of generation logic
    } finally {
      await page.close(); // ALWAYS close page
    }
  }
  
  // Add cleanup on shutdown
  static async cleanup() {
    if (PuppeteerPdfService.instance?.browser) {
      await PuppeteerPdfService.instance.browser.close();
      PuppeteerPdfService.instance.browser = null;
      PuppeteerPdfService.browserPromise = null;
    }
  }
}
```

**2. Update documentWorkflow.ts**
```typescript
private async createFileFromMarkdown(content: string, title: string): Promise<Buffer> {
  const engine = process.env.PDF_ENGINE?.toLowerCase();

  if (engine === 'puppeteer') {
    try {
      // Use singleton instance instead of creating new one
      const puppeteerPdfService = PuppeteerPdfService.getInstance();
      this.logger.info('Generating PDF with Puppeteer', { title });
      return await puppeteerPdfService.generatePdfFromMarkdown(content, title);
    } catch (error: any) {
      this.logger.error('Puppeteer PDF generation failed, falling back to pdfkit', {
        title,
        error: error?.message || error
      });
      // Fallback continues below
    }
  }

  // Default: PDFKit
  // ... existing pdfkit code
}
```

**3. Add Graceful Shutdown in server.ts**
```typescript
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, cleaning up...');
  await PuppeteerPdfService.cleanup();
  process.exit(0);
});
```

### Phase 3: Monitoring (Ongoing)

Add metrics to track:
1. PDF generation success/failure rates
2. Browser launch times
3. Memory usage during PDF generation
4. Queue depth if implementing queuing

## Testing the Fix

### Test 1: Verify PDFKit is being used
```bash
# Check logs for:
"Generating PDF with Puppeteer"  # Should NOT appear
# Or
"Puppeteer PDF generation failed"  # Fallback triggered
```

### Test 2: Concurrent Load Test
Submit 5-10 submissions simultaneously and monitor:
- Error rates
- Memory usage
- Response times

### Test 3: Check Railway Resources
```bash
railway logs | grep -i "resource\|memory\|oom"
```

## Environment Variable Summary

```bash
# Use PDFKit (recommended immediate fix)
PDF_ENGINE=pdfkit

# Or keep Puppeteer (after implementing singleton)
PDF_ENGINE=puppeteer
```

## Files Affected

1. `apps/api/src/services/puppeteerPdfService.ts` - Singleton implementation
2. `apps/api/src/services/documentWorkflow.ts` - Use singleton instance
3. `apps/api/src/server.ts` - Add cleanup handlers
4. Railway environment variables - Set PDF_ENGINE

## Related Issues

- This same pattern affects any Puppeteer usage in the codebase
- Consider similar fixes for any screenshot/browser automation services

---

**Status**: Root cause identified, immediate workaround available (PDF_ENGINE=pdfkit)
**Priority**: High (affecting user submissions)
**Effort**: Low (environment variable) or Medium (code fix)

