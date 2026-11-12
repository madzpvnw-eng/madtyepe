# madtype Firestore Security Specification

## 1. Data Invariants
1. A user document `/users/{userId}` can only be read, created, updated, or deleted by the authenticated owner (`request.auth.uid == userId`) with a verified email (`request.auth.token.email_verified == true`).
2. PII (`email`, `emailVerified`) is strictly isolated in `/users/{userId}/private/info` and is never readable by any other user.
3. Every subcollection (`/private/info`, `/sessions/{sessionId}`, `/favorites/{videoId}`) requires the parent `/users/{userId}` document to exist via `exists()` on single-document operations (`get`, `create`, `update`, `delete`).
4. `uid`, `videoId`, and `createdAt` fields are immutable once written; all timestamps must equal `request.time`.
5. No shadow/ghost keys (e.g., `isAdmin`, `role`) are permitted anywhere via strict `keys().hasAll(...)` and `keys().hasOnly(...)` allowlists.
6. All `list` queries explicitly enforce `resource.data.uid == request.auth.uid` without `get()`/`exists()` inside `allow list`.

## 2. Adversarial "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. **Unauthenticated read on `/users/{uid}`** -> Denied (`request.auth == null`).
2. **Cross-user `get` on `/users/victimUid/private/info`** -> Denied (`request.auth.uid != victimUid`).
3. **Unverified email creating `/users/{uid}`** (`email_verified == false`) -> Denied.
4. **UID spoofing in payload** (`/users/attackerUid` with `uid: "victimUid"`) -> Denied (`data.uid == request.auth.uid`).
5. **Shadow field injection on `/users/{uid}`** (adding `role: "admin"` or `isPro: true`) -> Denied (`keys().hasOnly(...)`).
6. **Client-forged `createdAt` timestamp** (`createdAt: "2020-01-01T00:00:00Z"`) -> Denied (`incoming().createdAt == request.time`).
7. **Mutating immutable `uid` or `createdAt` on `/users/{uid}` update** -> Denied (`affectedKeys().hasOnly(...)` + `incoming().createdAt == existing().createdAt`).
8. **Oversized `displayName` (>120 chars) or `photoURL` (>500 chars)** -> Denied (`.size()` bounds).
9. **ID poisoning with 1KB path segment** (`/users/{uid}/sessions/<1000_chars>`) -> Denied (`isValidId(sessionId)`).
10. **Orphan session write when `/users/{uid}` does not exist** -> Denied (`exists(/databases/.../users/$(userId))`).
11. **Invalid WPM (<0 or >500) or accuracy (<0 or >100) in `/sessions/{sessionId}`** -> Denied.
12. **Blanket `list` query on `/users` or cross-user `list` on `/users/victimUid/sessions`** -> Denied (`match /users` has no `list`; subcollection `list` checks `isOwner(userId) && resource.data.uid == request.auth.uid`).
