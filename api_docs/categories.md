# Category APIs

Base path: `/api/categories`

## 1) Get All Categories
- Method: `GET`
- Path: `/api/categories`
- Auth: Public (no token required)
- Access: Merchant/User/Guest (read-only)

## 2) Get Category By ID
- Method: `GET`
- Path: `/api/categories/:id`
- Auth: Public (no token required)
- Access: Merchant/User/Guest (read-only)

## 3) Get Subcategories By Category
- Method: `GET`
- Path: `/api/categories/:categoryId/subcategories`
- Auth: Public (no token required)
- Access: Merchant/User/Guest (read-only)

## 4) Add Category
- Method: `POST`
- Path: `/api/categories`
- Auth: Bearer token required
- Role: `super_admin` only
- Body:
```json
{
  "value": "restaurant",
  "label": "Restaurant",
  "description": "Food service businesses"
}
```

## 5) Update Category
- Method: `PUT`
- Path: `/api/categories/:id`
- Auth: Bearer token required
- Role: `super_admin` only
- Body (partial allowed):
```json
{
  "label": "Updated Label"
}
```

## 6) Soft Delete Category
- Method: `DELETE`
- Path: `/api/categories/:id`
- Auth: Bearer token required
- Role: `super_admin` only
- Behavior: sets `isActive = false`

## 7) Hard Delete Category
- Method: `DELETE`
- Path: `/api/categories/:id/permanent`
- Auth: Bearer token required
- Role: `super_admin` only
- Behavior: permanently removes category document
