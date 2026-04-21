# Merchant Profile APIs

Base path: `/api/merchant/profile`

## Update Merchant Profile (Protected)
- Method: `PUT`
- Path: `/api/merchant/profile`
- Auth: Bearer token required
- Content-Type: `multipart/form-data`

Fields:
- `name` (optional)
- `gender` (`male|female|other`, optional)
- `city` (optional)
- `phone` (10-digit, optional)
- `email` (optional)
- `profileImage` (image file, optional, max 5MB)

Response:
```json
{
  "success": true,
  "merchant": {
    "_id": "merchant_id",
    "phone": "+919876543210",
    "name": "Store Owner",
    "city": "Pune",
    "email": "owner@example.com"
  }
}
```
