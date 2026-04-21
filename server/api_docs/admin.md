# Admin APIs

Base path: `/api/admin`

Role management APIs require:
- Bearer token
- Role: `super_admin`

## 0) Bootstrap Super Admin (Initial Setup)
- Method: `POST`
- Path: `/api/admin/bootstrap-super-admin`
- Auth: No bearer token
- Header required: `x-bootstrap-secret: <BOOTSTRAP_ADMIN_SECRET>`
- Body:
```json
{
  "phone": "9876543210",
  "accountType": "user"
}
```
`accountType` allowed values:
- `user`
- `merchant`

Notes:
- This endpoint only works when `BOOTSTRAP_ADMIN_SECRET` is configured in `.env`.
- Use it once to set first super admin, then rotate/remove secret.


## User Management

### List All Users
- Method: `GET`
- Path: `/api/admin/users`
- Query Params: `page`, `limit`, `search`, `role`, `isVerified`
- Auth: Bearer token (super_admin)
- Response:
```json
{
  "success": true,
  "users": [ ... ],
  "total": 100,
  "page": 1,
  "pages": 10
}
```

### Get User Details
- Method: `GET`
- Path: `/api/admin/users/:id`
- Auth: Bearer token (super_admin)

### Update User Info
- Method: `PUT`
- Path: `/api/admin/users/:id`
- Body: `{ "name": "New Name", "address": "New Address", "gender": "male" }`
- Auth: Bearer token (super_admin)

### Ban/Unban User
- Method: `PUT`
- Path: `/api/admin/users/:id/status`
- Body: `{ "status": "banned" }` or `{ "status": "active" }`
- Auth: Bearer token (super_admin)

### Delete User
- Method: `DELETE`
- Path: `/api/admin/users/:id`
- Auth: Bearer token (super_admin)

### Update User Role
- Method: `PUT`
- Path: `/api/admin/users/:id/role`
- Body: `{ "role": "user" }` or `{ "role": "super_admin" }`
- Auth: Bearer token (super_admin)

---

## Merchant Management

### List All Merchants
- Method: `GET`
- Path: `/api/admin/merchants`
- Query Params: `page`, `limit`, `search`, `role`, `isVerified`
- Auth: Bearer token (super_admin)

### Get Merchant Details
- Method: `GET`
- Path: `/api/admin/merchants/:id`
- Auth: Bearer token (super_admin)

### Update Merchant Info
- Method: `PUT`
- Path: `/api/admin/merchants/:id`
- Body: `{ "name": "New Name", "city": "New City", "email": "new@example.com" }`
- Auth: Bearer token (super_admin)

### Verify/Reject Merchant
- Method: `PUT`
- Path: `/api/admin/merchants/:id/verify`
- Body: `{ "isVerified": true }` or `{ "isVerified": false }`
- Auth: Bearer token (super_admin)

### Ban/Unban Merchant
- Method: `PUT`
- Path: `/api/admin/merchants/:id/status`
- Body: `{ "status": "banned" }` or `{ "status": "active" }`
- Auth: Bearer token (super_admin)

### Delete Merchant
- Method: `DELETE`
- Path: `/api/admin/merchants/:id`
- Auth: Bearer token (super_admin)

### Update Merchant Role
- Method: `PUT`
- Path: `/api/admin/merchants/:id/role`
- Body: `{ "role": "merchant" }` or `{ "role": "super_admin" }`
- Auth: Bearer token (super_admin)

### Notes
- Use these endpoints to manage users and merchants instead of editing DB manually.
- Token payload contains `role` and `accountType`, but API authorization is validated against DB-backed role state.

## Postman Collection
- `api_docs/postman/admin-rbac-flow.postman_collection.json`
