# Merchant Shop APIs

Base path: `/api/merchant/shop`

## Upsert Shop Profile (Protected)
- Method: `PUT`
- Path: `/api/merchant/shop`
- Auth: Bearer token required
- Content-Type: `multipart/form-data`

Accepted fields (all optional):
- `shopName`
- `categoryId` (MongoDB ObjectId)
- `subCategoryId` (MongoDB ObjectId)
- `address`
- `city`
- `phone` (10-digit)
- `description`
- `openingHours` (object)

Accepted image files (optional, max 5MB each):
- `logoImage`
- `shopBannerImage`

Response:
```json
{
  "success": true,
  "shopId": "shop_id"
}
```
