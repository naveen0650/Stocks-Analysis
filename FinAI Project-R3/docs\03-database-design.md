# 03 — Database Design (Phase 1)

## ER diagram

```mermaid
erDiagram
    USER ||--o{ EXPENSE : creates
    USER ||--o{ INCOME : creates
    USER ||--o{ BUDGET : creates
    USER ||--o{ EXPENSE_CATEGORY : customizes
    USER ||--o{ SESSION_TOKEN : "authenticates with"
    USER ||--o{ DISCLAIMER_ACCEPTANCE : signs
    USER ||--o{ AUDIT_LOG : generates
    EXPENSE_CATEGORY ||--o{ EXPENSE : classifies
    EXPENSE_CATEGORY ||--o{ BUDGET : "scopes (optional)"

    USER {
        int id PK
        string email UK "nullable — email OR mobile"
        string mobile UK "nullable"
        string password_hash
        string full_name
        enum role "user | admin"
        bool is_active
        datetime last_login_at
        int failed_login_count
        datetime created_at
        datetime updated_at
    }
    EXPENSE {
        int id PK
        int user_id FK
        int category_id FK
        date expense_date
        numeric amount
        string subcategory
        enum payment_method
        string merchant
        text notes
        bool is_recurring
        string tags "comma separated"
        bool is_deleted "soft delete"
        datetime created_at
        datetime updated_at
    }
    INCOME {
        int id PK
        int user_id FK
        date income_date
        numeric amount
        string source
        text notes
        bool is_recurring
        bool is_deleted
    }
    BUDGET {
        int id PK
        int user_id FK
        int category_id FK "null = overall budget"
        enum period "monthly | yearly"
        string name
        numeric amount
        int alert_thresholds "JSON [50,75,90,100]"
        bool is_active
    }
    EXPENSE_CATEGORY {
        int id PK
        int user_id FK "null = system category"
        string name
    }
    SESSION_TOKEN {
        int id PK
        int user_id FK
        string token_hash "sha256 of refresh token"
        datetime expires_at
        datetime revoked_at
        string user_agent
        datetime created_at
    }
    DISCLAIMER_ACCEPTANCE {
        int id PK
        int user_id FK
        string version
        string ip_address
        datetime accepted_at
    }
    AUDIT_LOG {
        int id PK
        int user_id FK "nullable"
        string action
        string entity
        int entity_id
        string ip_address
        json meta
        datetime created_at
    }
```

## Design decisions

- **Identity**: `email` and `mobile` are both unique but nullable — the product
  allows signing up with either. At least one is required (validated at the
  service layer).
- **Money**: `Numeric(14, 2)` — never floats. Currency is INR app-wide.
- **Soft deletion** (`is_deleted`) on user financial rows: analytics history
  must survive corrections, and accidental deletion must be recoverable.
- **System vs custom categories**: `expense_category.user_id IS NULL` marks
  system defaults visible to everyone; users add their own rows. Deletion of a
  system category is rejected; deletion of a category in use is rejected.
- **Refresh tokens stored as hashes**: a database leak must not yield usable
  credentials. Tokens are sha256-hashed with their server-side secret salt.
- **Audit log** is append-only and covers auth events and admin actions.

## Indexes

| Table | Index | Reason |
|---|---|---|
| expense | `(user_id, expense_date)` | every analytics query filters by user + range |
| expense | `(user_id, category_id)` | category distribution |
| income | `(user_id, income_date)` | income aggregation |
| budget | `(user_id, is_active)` | budget status lookups |
| session_token | `token_hash` (unique) | refresh lookup |
| audit_log | `(user_id, created_at)` | user timeline |
| audit_log | `action` | admin security views |

## Phase 2–4 extensions (planned, not created yet)

`stock`, `company`, `financial_statement`, `market_price`, `news_article`,
`sentiment_analysis`, `valuation`, `valuation_scenario`, `portfolio`,
`portfolio_holding`, `portfolio_analysis`, `stock_analysis`, `report`,
`notification`, `api_usage`. The ER above is drawn so these attach without
reshaping Phase 1 tables.
