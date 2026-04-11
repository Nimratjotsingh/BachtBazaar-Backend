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

## 1) Update User Role
- Method: `PUT`
- Path: `/api/admin/users/:id/role`
- Body:
```json
{
  "role": "user"
}
```
Allowed roles for users:
- `user`
- `super_admin`

## 2) Update Merchant Role
- Method: `PUT`
- Path: `/api/admin/merchants/:id/role`
- Body:
```json
{
  "role": "merchant"
}
```
Allowed roles for merchants:
- `merchant`
- `super_admin`

## Notes
- Use these endpoints to assign roles instead of editing DB manually.
- Token payload contains `role` and `accountType`, but API authorization is validated against DB-backed role state.

## Postman Collection
- `api_docs/postman/admin-rbac-flow.postman_collection.json`
