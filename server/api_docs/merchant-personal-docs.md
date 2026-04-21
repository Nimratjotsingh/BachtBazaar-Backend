# Merchant Personal Docs APIs

Base path: `/api/merchant/personal-docs`

## Upsert Personal Documents (Protected)
- Method: `POST`
- Path: `/api/merchant/personal-docs`
- Auth: Bearer token required
- Content-Type: `multipart/form-data`

Accepted files (optional, max 5MB each):
- `aadharImage`
- `panImage`

Accepted fields:
- Aadhaar flow:
  - `aadharNumber`
  - `aadharImage`
- PAN flow:
  - `panNumber`
  - `panImage`
  - `name`
  - `dob`

Validation rule:
- At least one valid flow is required:
  - Aadhaar (`aadharNumber + aadharImage`) OR
  - PAN (`panNumber + panImage + name + dob`)

Response:
```json
{
  "success": true,
  "personalDocsId": "doc_id"
}
```
