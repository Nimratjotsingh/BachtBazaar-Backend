# Common Conventions

## Authentication

Protected APIs require:

`Authorization: Bearer <jwt_token>`

## Content Types

- JSON APIs: `application/json`
- File upload APIs: `multipart/form-data`

## File Upload Rules

From upload middleware:

- Only image mime types are allowed (`image/*`)
- Max file size: `5 MB` per uploaded file
- Files are stored in MongoDB as binary buffers

## Standard Success Shape

Most APIs return:

```json
{
  "success": true,
  "...": "payload"
}
```

## Common Error Codes

- `400` Bad Request / validation issues
- `401` Unauthorized / invalid token
- `404` Resource not found
- `500` Internal server error
