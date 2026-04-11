# Merchant Business Docs APIs

Base path: `/api/merchant/business-docs`

## Upsert Business Documents (Protected)
- Method: `POST`
- Path: `/api/merchant/business-docs`
- Auth: Bearer token required
- Content-Type: `multipart/form-data`

Accepted number fields (all optional):
- `gstNumber`
- `tradeLicenseNumber`
- `shopRegistrationNumber`
- `fssaiNumber`

Accepted image files (all optional, max 5MB each):
- `gstImage`
- `tradeLicenseImage`
- `shopRegistrationImage`
- `fssaiImage`

Validation rule:
- At least one field or file must be provided.

Response:
```json
{
  "success": true,
  "businessDocsId": "doc_id"
}
```
