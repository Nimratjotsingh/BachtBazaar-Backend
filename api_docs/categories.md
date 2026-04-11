# Category APIs

Base path: `/api/categories`

## 1) Get All Categories
- Method: `GET`
- Path: `/api/categories`

## 2) Get Category By ID
- Method: `GET`
- Path: `/api/categories/:id`

## 3) Add Category
- Method: `POST`
- Path: `/api/categories`
- Body:
```json
{
  "value": "restaurant",
  "label": "Restaurant",
  "description": "Food service businesses"
}
```

## 4) Update Category
- Method: `PUT`
- Path: `/api/categories/:id`
- Body (partial allowed):
```json
{
  "label": "Updated Label"
}
```

## 5) Soft Delete Category
- Method: `DELETE`
- Path: `/api/categories/:id`
- Behavior: sets `isActive = false`

## 6) Hard Delete Category
- Method: `DELETE`
- Path: `/api/categories/:id/permanent`
- Behavior: permanently removes category document
