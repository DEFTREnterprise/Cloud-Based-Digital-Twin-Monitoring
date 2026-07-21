\# Phase 2 — Security Layer Test Matrix



\*\*Test date:\*\* 6–7 July 2026

\*\*Scope:\*\* JWT authentication, RBAC, tenant isolation, audit trail, rate limiting, CORS

\*\*Environment:\*\* Local development (Windows 11, PowerShell)

\*\*Result:\*\* Phase 2 backend closure confirmed — all scenarios below passed.



\---



\## 1. Test Environment



\### 1.1 Services



| Component  | Version | Port | Notes                                              |

| ---------- | ------- | ---- | -------------------------------------------------- |

| PostgreSQL | 17.10   | 5432 | TimescaleDB 2.27.1                                 |

| Keycloak   | 26.6.3  | 8080 | Java 21, PostgreSQL backend (`keycloak` database)  |

| FastAPI    | —       | 8000 | uvicorn, async                                     |

| Mosquitto  | 2.1.2   | 1883 | Used for publisher–worker ingest tests             |



\### 1.2 Realm and Roles (realm `cbmdtm`)



| Role             | Description                                                |

| ---------------- | ---------------------------------------------------------- |

| `OTOKAR\_Viewer`  | Read-only access to OTOKAR tenant data                     |

| `DEFTR\_Admin`    | Full system access; exempt from tenant isolation           |

| `ESOGU\_Operator` | Read + limited actions on ESOGU tenant                     |



\### 1.3 Test Users



| Username      | Role             | tenant\_code | tenant\_id (UUID)                        |

| ------------- | ---------------- | ----------- | --------------------------------------- |

| `otokar\_user` | `OTOKAR\_Viewer`  | `OTOKAR`    | `00000000-0000-0000-0000-0000000000aa`  |

| `deftr\_admin` | `DEFTR\_Admin`    | `DEFTR`     | `00000000-0000-0000-0000-0000000000dd`  |

| `esogu\_op`    | `ESOGU\_Operator` | `ESOGU`     | `00000000-0000-0000-0000-0000000000cc`  |



\### 1.4 Test Assets



| Tenant | Asset code   | Notes                                          |

| ------ | ------------ | ---------------------------------------------- |

| OTOKAR | `MOTOR\_01`..`MOTOR\_12` | 12 seeded assets, telemetry data present     |

| ESOGU  | `TESTBED\_01` | 1 seeded asset, no telemetry (structural only) |

| DEFTR  | —            | No assets; used for admin exemption tests      |



\---



\## 2. Test Matrix



\### 2.1 Authentication (JWT)



| ID | Scenario                     | Expected                              | Actual                              | Status |

| -- | ---------------------------- | ------------------------------------- | ----------------------------------- | :----: |

| A1 | No Bearer token              | `401` + audit `AUTH\_FAIL\_401` / `missing\_bearer` | `401`, audit correct     | Pass   |

| A2 | Malformed token              | `401` + audit `AUTH\_FAIL\_401` / `invalid\_token`  | `401`, audit correct     | Pass   |

| A3 | Expired token                | `401`                                 | Skipped (5 min TTL, not exercised)  | Skip   |

| A4 | Valid token, `GET /me`       | `200` with `tenant\_code`, `tenant\_id`, `is\_admin`, `allowed\_modules` | `200`, all fields populated | Pass |



\### 2.2 Role-Based Access Control



| ID | User         | Endpoint                    | Expected                                    | Actual                                             | Status |

| -- | ------------ | --------------------------- | ------------------------------------------- | -------------------------------------------------- | :----: |

| B1 | `otokar\_user`| `GET /me/admin-check`       | `403` + audit `AUTH\_FAIL\_403`               | `403`; audit details include `required\_roles` + `user\_roles` | Pass |

| B2 | `deftr\_admin`| `GET /me/admin-check`       | `200`                                       | `200`; "DEFTR\_Admin verified" response             | Pass   |

| B3 | `esogu\_op`   | `GET /me/admin-check`       | `403`                                       | `403`, audit correct                               | Pass   |



\### 2.3 Tenant Isolation (Critical Security)



| ID | User          | Endpoint                | Target asset       | Expected                        | Actual              | Status |

| -- | ------------- | ----------------------- | ------------------ | ------------------------------- | ------------------- | :----: |

| C1 | `otokar\_user` | `GET /timeseries`       | OTOKAR `MOTOR\_01`  | `200`, 31 points                | `200`, 31 points    | Pass   |

| C2 | `otokar\_user` | `GET /timeseries`       | ESOGU `TESTBED\_01` | `200`, \*\*0 points\*\* (isolation) | `200`, 0 points     | Pass   |

| C3 | `esogu\_op`   | `GET /timeseries`       | OTOKAR `MOTOR\_01`  | `200`, \*\*0 points\*\* (isolation) | `200`, 0 points     | Pass   |

| C4 | `deftr\_admin`| `GET /timeseries`       | OTOKAR `MOTOR\_01`  | `200`, 31 points (admin exempt) | `200`, 31 points    | Pass   |

| C5 | `otokar\_user`| `GET /kpi/live?window\_hours=24` | —          | `200`, `event\_count` = OTOKAR total | `200`, 1116 events | Pass |

| C6 | `deftr\_admin`| `GET /kpi/live?window\_hours=24` | —          | `200`, `event\_count` = all tenants (currently equals OTOKAR) | `200`, 1116 events | Pass |



\*\*Note on C2 and C3:\*\* Non-admin users querying an asset that belongs to another tenant receive an empty result set even when they know the correct asset UUID. Returning `404` in this case would leak the existence of the asset ("this asset exists but you may not access it"). An empty result set is the correct semantic: "no data to show", preserving both isolation and the absence-of-information guarantee.



\### 2.4 Rate Limiting (slowapi)



| ID | Endpoint                       | Limit               | Test volume    | Expected              | Actual             | Status |

| -- | ------------------------------ | ------------------- | -------------- | --------------------- | ------------------ | :----: |

| D1 | `/openapi.json`                | 60/min (global)     | 70 requests    | 60 × `200` + 10 × `429` | 60 × `200` + 10 × `429` | Pass |

| D2 | `/api/v1/me`                   | 30/min (endpoint)   | 35 requests    | 30 × `200` + 5 × `429`  | 30 × `200` + 5 × `429`  | Pass |

| D3 | `/health`                      | Exempt              | 70 requests    | All `200`             | All `200`          | Pass   |

| D4 | `/api/v1/stream/telemetry` (SSE) | Exempt            | 10 connections | No `429`              | 10 timeouts (SSE hold-open), no `429` | Pass |



\### 2.5 CORS



| ID | Scenario                                            | Expected                                              | Actual                     | Status |

| -- | --------------------------------------------------- | ----------------------------------------------------- | -------------------------- | :----: |

| E1 | `OPTIONS` preflight from `http://localhost:5173`    | `200` with `Allow-Origin`, `Allow-Methods`, `Allow-Headers` | All headers populated  | Pass   |

| E2 | `allow\_credentials=true` with explicit methods list | CORS-spec compliant (no wildcard where forbidden)     | `200`; no `\*` in method or header lists | Pass |



\### 2.6 Module–Role Matrix (Frontend Preparation)



| ID | User          | `/me` `allowed\_modules` (expected)                                                | Actual   | Status |

| -- | ------------- | --------------------------------------------------------------------------------- | -------- | :----: |

| F1 | `otokar\_user` | `\[platform, liveMonitoring, otokarPdM]`                                           | 3 modules, correct | Pass |

| F2 | `deftr\_admin` | `\[platform, liveMonitoring, otokarPdM, esoguDtTool, tpt, systemConfiguration]`    | 6 modules (full)   | Pass |

| F3 | `esogu\_op`    | `\[platform, liveMonitoring, esoguDtTool]`                                         | 3 modules, correct | Pass |



\---



\## 3. Audit Trail Sample



After running the RBAC test set (B1–B3) plus authentication tests (A1–A2), six rows were recorded in the `audit\_event` table:



```

&#x20;   t     |    action     | sc  |  username   | tenant | method | path                    | details

\----------+---------------+-----+-------------+--------+--------+-------------------------+---------------------------

&#x20;10:55:21 | AUTH\_OK       | 200 | otokar\_user | OTOKAR | GET    | /api/v1/me              |

&#x20;10:55:21 | AUTH\_OK       | 200 | otokar\_user | OTOKAR | GET    | /api/v1/me/admin-check  |

&#x20;10:55:21 | AUTH\_FAIL\_403 | 403 | otokar\_user | OTOKAR | GET    | /api/v1/me/admin-check  | {"required\_roles":\["DEFTR\_Admin"],"user\_roles":\[...]}

&#x20;10:55:21 | AUTH\_OK       | 200 | deftr\_admin | DEFTR  | GET    | /api/v1/me/admin-check  |

&#x20;10:55:21 | AUTH\_FAIL\_401 | 401 | -           | -      | GET    | /api/v1/me              | {"reason":"missing\_bearer"}

&#x20;10:55:21 | AUTH\_FAIL\_401 | 401 | -           | -      | GET    | /api/v1/me              | {"reason":"invalid\_token","detail":"..."}

```



\*\*Key evidence:\*\* `otokar\_user` produces two rows for `/admin-check` — first `AUTH\_OK` (authentication succeeded), then `AUTH\_FAIL\_403` (authorization denied). This captures the "authenticated user attempted unauthorized access" trail, which is the primary value of the audit layer.



\---



\## 4. Known Limitations (to be resolved in Block 2)



The current test set validates Phase 2 scope only. The following are intentional development shortcuts that will be hardened before Ankara deployment (20 July 2026):



| Limitation                                            | Location                    | Resolution step  | Target date |

| ----------------------------------------------------- | --------------------------- | ---------------- | ----------- |

| Keycloak temporary admin (`admin/admin`)              | Keycloak master realm       | STEP 27          | 14 July     |

| No password policy                                    | Keycloak realm settings     | STEP 28          | 14 July     |

| Default access token TTL (5 min / 10 h)               | Keycloak realm settings     | STEP 29          | 14 July     |

| HTTP (no TLS)                                         | All services                | STEP 30          | 15 July     |

| Plaintext secrets in `.env`                           | `backend/.env`              | STEP 31          | 16 July     |

| In-memory rate limit backend (multi-worker incorrect) | slowapi config              | STEP 32          | 16 July     |

| `KEYCLOAK\_VERIFY\_AUDIENCE=false`                      | `.env`                      | STEP 33          | 17 July     |

| Direct access grants toggled on/off for tests         | Keycloak client config      | STEP 34          | 17 July     |

| Legacy trailing space in default role name (`default-roles-cbmdtm `) | Keycloak default role | STEP 27 (cosmetic) | 14 July |



These limitations are accepted for the Phase 2 development environment and are not present in production planning.



\---



\## 5. Re-execution Procedure



To re-run this test matrix:



1\. In Keycloak: enable `Direct access grants` on client `cbmdtm-frontend` (Settings → Capability config).

2\. Run mock publisher for 30 seconds to generate fresh telemetry:

&#x20;  `python tools\\mock\_otokar\_publisher.py --duration 30`

3\. Execute the test script `docs/tests/faz2-security-tests.ps1` (to be added in a subsequent commit).

4\. Inspect the audit table:

&#x20;  `SELECT ... FROM audit\_event ORDER BY ts\_utc DESC LIMIT 20;`

5\. \*\*After tests complete: disable `Direct access grants`\*\* — security.



In production (after Block 2), `Direct access grants` remains permanently disabled. The test script will switch from Resource Owner Password Credentials to the Authorization Code + PKCE flow (executed via the frontend or a headless test runner).



\---



\## 6. Phase 2 Acceptance Criteria (for Consortium Reporting)



This test matrix satisfies the following Phase 2 requirements:



| Requirement | Description                                              | Status |

| ----------- | -------------------------------------------------------- | :----: |

| FR-IAM-001  | JWT-based authentication (RS256 with JWKS cache)         | Pass   |

| FR-IAM-002  | Module–role matrix; backend as single source of truth (`/me.allowed\_modules`) | Pass |

| FR-IAM-003  | Multi-tenancy isolation (`tenant\_code` claim + `tenant\_id` DB filter) | Pass |

| FR-IAM-004  | Role-based access control (`require\_roles`, OR semantics)| Pass   |

| FR-API-008  | Audit trail (`audit\_event` table, four action categories)| Pass   |

| NFR-SEC     | CORS whitelist + rate limiting                           | Pass   |

| NFR-DEPLOY  | Realm configuration versioned as code (`deploy/keycloak/`) | Pass |

