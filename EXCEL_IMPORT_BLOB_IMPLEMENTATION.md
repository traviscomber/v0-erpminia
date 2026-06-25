# Excel Import with Vercel Blob - Implementation Status

## Overview
The Excel import flow for `/dashboard/compras/importar-existencias` has been successfully implemented to handle large XLS/XLSX files without hitting the server payload limit.

## Architecture

### Client Flow (page.tsx)
1. User selects an Excel file (XLS/XLSX)
2. File is uploaded directly to Vercel Blob via `@vercel/blob/client`
3. Upload uses `/api/compras/import-existencias/upload` for token generation
4. After successful blob upload, only the blob reference is sent to the server:
   - `blobUrl`: Full Blob URL for download
   - `blobPathname`: Blob storage path
   - `fileName`: Original filename for logging

### Server Flow

#### Route 1: `/api/compras/import-existencias/upload`
- Validates authentication
- Generates secure client upload token
- Restricts file types to Excel only (`.xls`, `.xlsx`)
- Enforces maximum file size: 150MB
- Configures multipart upload for files > 8MB

**Key Features:**
- File validation: Only Excel MIME types allowed
- Security: Private blob access, user/org context stored in token
- Token validity: 1 hour
- Organization isolation: Each org's uploads are separate

#### Route 2: `/api/compras/import-existencias`
- Accepts either:
  - JSON with blob reference (primary flow)
  - Multipart form data with file (fallback for small files)
- Downloads file from Vercel Blob
- Parses Excel workbook with 3 sheets:
  1. **Proveedores**: Supplier master data (name, RUT, contact info)
  2. **Stock min-max**: Inventory items with reorder levels
  3. **Compras**: Purchase orders grouped by PO number

**Transactional Safety:**
- Only deletes imports from THIS source:
  - Purchase orders matching pattern `EX-%` (from this import)
  - Warehouse stock with `batch_number='MINMAX'`
- Does NOT delete other data
- All operations use upsert to avoid duplicates

**Data Processing:**
- Supplier import: Upserts by (organization_id, RUT), inserts new non-RUT suppliers
- Stock import: Upserts by (organization_id, part_code, batch_number)
- Purchase import: Upserts by (organization_id, po_number)
- Batch processing in 500-row chunks for large imports
- Automatic blob deletion after successful import

## File Structure

```
app/
├── dashboard/
│   └── compras/
│       └── importar-existencias/
│           └── page.tsx                    (Client import UI)
└── api/
    └── compras/
        └── import-existencias/
            ├── upload/
            │   └── route.ts               (Token generation)
            └── route.ts                   (Import processing)
```

## Security & Constraints

✓ **Authentication**: All routes require valid user session
✓ **Organization Isolation**: Data scoped to organization_id
✓ **File Type Validation**: Only Excel MIME types accepted
✓ **File Size Limit**: 150MB maximum
✓ **Blob Access**: Private access, user-specific tokens
✓ **CSP Compliance**: Connect-src allows *.blob.vercel-storage.com
✓ **Payload Size**: No FUNCTION_PAYLOAD_TOO_LARGE errors (blob reference only)
✓ **Transactional**: Only deletes imports from this source

## Content Security Policy

The CSP header must include:
```
connect-src 'self' https://*.blob.vercel-storage.com
```

This allows the browser to upload files to Vercel Blob storage.

## Failover & Fallback

- Supports multipart form upload for files <= 8MB
- If blob upload fails, falls back to form data submission
- All error cases delete temporary blob files
- Comprehensive error messages in Spanish

## Implementation Checklist

- [x] Client page with Blob upload flow
- [x] Upload token generation route
- [x] Import processing route
- [x] Excel workbook parsing (3 sheets)
- [x] Supplier data import
- [x] Stock min-max import
- [x] Purchase order import
- [x] Transactional safety (only delete this import source)
- [x] Blob cleanup after import
- [x] Error handling and Spanish messages
- [x] Multipart support for large files
- [x] Organization isolation
- [x] Authentication guards

## Testing Checklist

Use the import page at `/dashboard/compras/importar-existencias` to:
- [ ] Upload a sample Excel file with 3 sheets
- [ ] Verify suppliers are created/updated
- [ ] Verify stock min-max items are created
- [ ] Verify purchase orders are created
- [ ] Check that blob file is deleted after import
- [ ] Test with >8MB file (multipart)
- [ ] Test with invalid file type (should error)
- [ ] Test with >150MB file (should error)

## Data Models

### Suppliers (from "Proveedores" sheet)
- name, rut, email, phone
- address, city, region, country
- business_type, contact_person
- payment_terms, status

### Stock (from "Stock min-max" sheet)
- part_code, part_name
- quantity_on_hand, reorder_level, reorder_quantity
- unit_cost, batch_number, supplier_lot

### Purchases (from "Compras" sheet)
- po_number, vendor_name
- item_code, quantity, unit_price
- total_amount, delivery_date, status

## Environment Variables Required

- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key
- `BLOB_READ_WRITE_TOKEN`: Vercel Blob token (for server-side operations)

## Performance Notes

- Blob upload uses native browser multipart for files > 8MB
- Server processes in 500-row batches to manage memory
- Maximum function duration: 60 seconds (covers ~10K rows)
- Deleted blobs are removed immediately after import

## Future Enhancements

- Add progress tracking for import processing
- Email notification after successful import
- Audit log entries for all imports
- Ability to preview import before confirming
- Template download for users
- Historical import tracking
