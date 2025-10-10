# Future OCR Integration for Packing Slips

## Overview
This document outlines how to add OCR (Optical Character Recognition) to automatically extract data from uploaded packing slip images/PDFs.

## Current State
- ✅ Packing slips can be uploaded and stored
- ✅ Files are viewable via signed URLs
- ✅ Files stored in `public/uploads/packing-slips/` (dev) or S3 (prod)
- ⏳ OCR processing not yet implemented (waiting for real packing slip examples)

## When to Implement
Implement OCR once you have:
1. Multiple real packing slip examples
2. Understanding of what data fields are consistently present
3. Business rules for what data to auto-extract

## OCR Service Options

### Option 1: AWS Textract (Recommended for Production)
**Pros:**
- Already using AWS S3
- Excellent accuracy for forms and receipts
- Can extract tables and key-value pairs
- Handles handwritten text

**Cons:**
- Costs money (~$1.50 per 1000 pages for basic text extraction)
- Requires AWS credentials

**Implementation:**
```bash
npm install @aws-sdk/client-textract
```

### Option 2: Tesseract.js (Recommended for Development)
**Pros:**
- Free and open source
- Works offline
- Good for typed text
- No external API needed

**Cons:**
- Lower accuracy than cloud services
- Slower processing
- Doesn't handle handwriting well

**Implementation:**
```bash
npm install tesseract.js
```

### Option 3: Google Cloud Vision
**Pros:**
- Very accurate
- Good language support
- Can detect document structure

**Cons:**
- Requires Google Cloud account
- Costs money

## Integration Points

### 1. Upload Endpoint
**File:** `/src/app/api/materials/upload-packing-slip/route.ts`

After file upload succeeds, add OCR processing:

```typescript
// After successful upload
const result = await storage.upload({ ... })

// Add OCR processing here
const ocrText = await processOCR(result.key)

return NextResponse.json({
  success: true,
  key: result.key,
  url: result.url,
  ocrData: ocrText // Add OCR results
})
```

### 2. Create OCR Service
**Create new file:** `/src/lib/ocr.ts`

```typescript
// Example Tesseract.js implementation
import Tesseract from 'tesseract.js'

export async function extractTextFromImage(imageBuffer: Buffer): Promise<string> {
  const result = await Tesseract.recognize(imageBuffer, 'eng')
  return result.data.text
}

// Example AWS Textract implementation
import { TextractClient, DetectDocumentTextCommand } from '@aws-sdk/client-textract'

export async function extractTextFromS3(bucket: string, key: string): Promise<string> {
  const client = new TextractClient({ region: 'us-east-2' })

  const command = new DetectDocumentTextCommand({
    Document: {
      S3Object: { Bucket: bucket, Name: key }
    }
  })

  const response = await client.send(command)
  return response.Blocks
    ?.filter(block => block.BlockType === 'LINE')
    .map(block => block.Text)
    .join('\n') || ''
}
```

### 3. Parse Extracted Text
**Create new file:** `/src/lib/parse-packing-slip.ts`

```typescript
interface PackingSlipData {
  materialCode?: string
  quantity?: number
  vendor?: string
  date?: string
  totalCost?: number
  rawText: string
}

export function parsePackingSlip(ocrText: string): PackingSlipData {
  // Add parsing logic based on your packing slip format
  // Examples:

  // Extract part numbers (e.g., "P/N: ABC-123")
  const materialCodeMatch = ocrText.match(/P\/N:\s*([A-Z0-9-]+)/i)

  // Extract quantities (e.g., "Qty: 50")
  const quantityMatch = ocrText.match(/Qty:\s*(\d+)/i)

  // Extract dates (e.g., "Date: 10/08/2025")
  const dateMatch = ocrText.match(/Date:\s*(\d{2}\/\d{2}\/\d{4})/i)

  return {
    materialCode: materialCodeMatch?.[1],
    quantity: quantityMatch ? parseInt(quantityMatch[1]) : undefined,
    date: dateMatch?.[1],
    rawText: ocrText
  }
}
```

### 4. Store OCR Data
**Database Migration:**

```sql
-- Add OCR data columns to TimeEntryMaterial table
ALTER TABLE "TimeEntryMaterial"
ADD COLUMN "ocrText" TEXT,
ADD COLUMN "ocrData" JSONB,
ADD COLUMN "ocrProcessedAt" TIMESTAMP;
```

### 5. Update Frontend
**File:** `/src/components/time/MultiJobTimeEntry.tsx`

After file upload, display OCR results:

```typescript
const uploadPackingSlip = async (entryId: string, materialId: string, file: File) => {
  // ... existing upload code ...

  const result = await response.json()

  // Display OCR results if available
  if (result.ocrData) {
    // Auto-fill fields or show suggestions
    console.log('OCR extracted:', result.ocrData)

    // Option: Auto-populate quantity if detected
    if (result.ocrData.quantity) {
      updateMaterial(entryId, materialId, 'quantity', result.ocrData.quantity.toString())
    }
  }
}
```

## Workflow After Implementation

1. **Employee uploads packing slip**
2. **System processes OCR** (async, doesn't block upload)
3. **System extracts:**
   - Material codes
   - Quantities
   - Vendor info
   - Dates
   - Costs (if visible)
4. **System attempts to match** material code to existing materials in database
5. **UI shows suggestions:**
   - "We found material 'ABC-123' in the system. Use this?"
   - "Detected quantity: 50. Apply?"
6. **Employee reviews and confirms** or manually enters
7. **Raw OCR text saved** for future reference/search

## Testing Strategy

1. **Collect sample packing slips** (10-20 different formats)
2. **Run OCR on samples** to see what data is consistently extractable
3. **Build regex patterns** for each data field
4. **Test accuracy** (aim for >90% for typed text)
5. **Add fallback** for manual entry when OCR confidence is low

## Cost Estimates

### AWS Textract Pricing (as of 2025)
- **DetectDocumentText**: $1.50 per 1,000 pages
- **AnalyzeDocument**: $50-65 per 1,000 pages (for tables/forms)

**Example:** 100 packing slips/month = $0.15-0.65/month

### Development Environment
- Use Tesseract.js for free testing
- Only enable Textract in production

## Performance Considerations

- OCR processing takes 2-10 seconds depending on file size
- Run OCR asynchronously (don't block file upload)
- Cache OCR results in database
- Show loading indicator in UI

## Future Enhancements

1. **ML-based parsing** - Train model on your specific packing slip formats
2. **Confidence scores** - Only auto-fill when OCR is >95% confident
3. **Vendor-specific parsers** - Different logic per supplier
4. **Receipt/invoice OCR** - Expand to other document types
5. **Mobile camera** - Direct photo upload from phone

## Files to Create When Implementing

- [ ] `/src/lib/ocr.ts` - OCR service wrapper
- [ ] `/src/lib/parse-packing-slip.ts` - Text parsing logic
- [ ] `/src/app/api/materials/process-ocr/route.ts` - OCR processing endpoint
- [ ] `/src/lib/db-migrations/YYYY-MM-DD-add-ocr-columns.sql` - Database migration
- [ ] `/tests/ocr.test.ts` - OCR tests with sample images

## Next Steps

1. ✅ Collect 10-20 real packing slip examples
2. ✅ Analyze common fields and formats
3. ✅ Choose OCR service (Textract vs Tesseract)
4. ✅ Install dependencies
5. ✅ Implement OCR service wrapper
6. ✅ Build parsing logic
7. ✅ Add database columns
8. ✅ Update API endpoints
9. ✅ Update frontend UI
10. ✅ Test and refine

---

**Status:** Deferred until packing slip format is understood
**Last Updated:** October 10, 2025
**Contact:** See CLAUDE.md for project context
