# MiniLedger 💳

> A personal loan tracking and micro-ledger system built with **Express**, **TypeScript**, **PostgreSQL**, and **React Native (Expo)**.

MiniLedger simplifies informal peer-to-peer lending among friends and family. It allows users to track lent amounts, due dates, repayment status, and aggregate financial metrics with strict tenant isolation, PostgreSQL relational constraints, and a secure mobile client.

---

## 📑 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Technology Stack](#-technology-stack)
- [System Architecture](#-system-architecture)
- [Directory Structure](#-directory-structure)
- [Database Schema & Relationships](#-database-schema--relationships)
- [Environment Configuration](#-environment-configuration)
- [PostgreSQL Database Setup](#-postgresql-database-setup)
- [Getting Started](#-getting-started)
  - [Backend Setup & Execution](#backend-setup--execution)
  - [Mobile Application Setup & Execution](#mobile-application-setup--execution)
- [Mock OTP Authentication Workflow](#-mock-otp-authentication-workflow)
- [REST API Documentation](#-rest-api-documentation)
- [Automated Testing](#-automated-testing)
- [Troubleshooting & Mobile Networking](#-troubleshooting--mobile-networking)
- [Security Considerations & Known Limitations](#-security-considerations--known-limitations)
- [Internship Submission Checklist](#-internship-submission-checklist)

---

## 🌟 Overview

When lending money to friends or colleagues, informal tracking often leads to awkward reminders, forgotten debts, and accounting errors. MiniLedger provides an auditable, tenant-isolated ledger where users can:
1. Log loans with clear due dates, amounts, and optional contextual notes.
2. Monitor real-time financial health through dynamic metrics (**Total Lent**, **Total Repaid**, **Overdue Amount**, and **Pending Amount**).
3. Mark loans as repaid with cryptographic timestamp auditing.
4. Access the ledger seamlessly from an Android device or emulator via an Expo mobile app.

---

## 🚀 Key Features

- **Phone-Based Authentication**: Secure passwordless authentication using a 6-digit OTP with attempt limits, expiry, and single-use enforcement.
- **Tenant Isolation**: Strict user-level row security enforced through parameterized SQL queries and JWT claim extraction; users can never view or manipulate another person's ledger.
- **Relational Integrity**: Enforced via PostgreSQL `CHECK (amount > 0)`, `UNIQUE (phone_number)`, and cascading foreign keys (`ON DELETE CASCADE`).
- **Dynamic Overdue Calculations**: Computed on-the-fly (`is_repaid = FALSE AND due_date < CURRENT_DATE`) to guarantee that repaid loans are never classified as overdue.
- **Duplicate Request Prevention**: In-flight state locks and per-item loading states prevent accidental double-submissions or race conditions.
- **Encrypted Local Storage**: Mobile client stores JWTs securely on Android Keystore / iOS Keychain via `expo-secure-store`.
- **In-App Network Switcher**: Real-time modal in the mobile app allows seamless switching between Android Emulator (`10.0.2.2`), Wi-Fi LAN IP, and Localhost with live connectivity testing.
- **Development Resilience**: If native PostgreSQL is not running on localhost, the backend automatically bootstraps an in-memory PostgreSQL engine (`pg-mem`) loaded with the exact relational schema and sample seed data.

---

## 🛠 Technology Stack

### Backend
- **Runtime**: Node.js (v20+)
- **Language**: TypeScript (v5.7+)
- **Web Framework**: Express (v4.21+)
- **Database Engine**: PostgreSQL (v14+) via `pg` (node-postgres connection pool)
- **Validation**: Zod (v3.24+)
- **Security & Tokens**: JSON Web Token (`jsonwebtoken`), `cors`, `dotenv`
- **Testing**: Jest, Supertest, `pg-mem` (in-memory PostgreSQL clone for hermetic tests)
- **Development Tooling**: `tsx` (TypeScript Execution Engine)

### Mobile Client
- **Framework**: React Native with Expo (SDK 58)
- **Language**: TypeScript
- **State Management**: React Context (`AuthContext`)
- **Secure Persistence**: `expo-secure-store`
- **Iconography**: `@expo/vector-icons` (Ionicons)
- **Component Styling**: Vanilla React Native `StyleSheet` with tailored financial design tokens

---

## 🏛 System Architecture

```mermaid
flowchart TD
    subgraph Mobile Client ["Mobile Client (React Native / Expo)"]
        UI["User Interface\n(Login, OTP, Dashboard, Add Loan)"]
        AC["Auth Context\n(Session & Base URL State)"]
        SS["Secure Storage\n(expo-secure-store)"]
        API_SVC["API Service\n(fetch with timeout & Bearer token)"]
        
        UI --> AC
        AC <--> SS
        UI --> API_SVC
        AC -.->|Injects Token| API_SVC
    end

    subgraph Backend Service ["Backend API (Express / TypeScript)"]
        GW["Express Router (/api)"]
        AUTH_MW["JWT Auth Middleware\n(Bearer verification)"]
        VAL_MW["Zod Validation Middleware\n(Request schema enforcement)"]
        
        CTRL_A["Auth Controller"]
        CTRL_L["Loan Controller"]
        CTRL_S["Summary Controller"]
        
        SVC_A["Auth Service\n(OTP generation & verification)"]
        SVC_L["Loan Service\n(Ledger CRUD & Overdue logic)"]
        
        GW -->|/api/auth| CTRL_A
        GW -->|/api/loans| AUTH_MW --> VAL_MW --> CTRL_L
        GW -->|/api/summary| AUTH_MW --> CTRL_S
        
        CTRL_A --> SVC_A
        CTRL_L --> SVC_L
        CTRL_S --> SVC_L
    end

    subgraph Database Layer ["PostgreSQL Storage Layer"]
        POOL["Connection Pool (pg.Pool)"]
        T_USERS[("users Table\n(id, phone_number)")]
        T_OTP[("otp_codes Table\n(phone, code, expires_at, attempts)")]
        T_LOANS[("loans Table\n(user_id, amount, due_date, is_repaid)")]
        
        SVC_A --> POOL
        SVC_L --> POOL
        POOL --> T_USERS
        POOL --> T_OTP
        POOL --> T_LOANS
    end

    API_SVC -->|HTTP REST / JSON| GW
```

---

## 📁 Directory Structure

```text
MiniLedger/
├── .gitignore                            # Root gitignore (excludes .env, node_modules, builds)
├── .env.example                          # Root environment template
├── README.md                             # Comprehensive project documentation
├── postman/                              # Exported API request collections
│
├── backend/                              # Express & TypeScript Backend API
│   ├── .env.example                      # Backend-specific environment template
│   ├── package.json                      # Backend dependencies & npm scripts
│   ├── tsconfig.json                     # Production TypeScript configuration
│   ├── jest.config.js                    # Jest test runner configuration
│   ├── sql/
│   │   ├── schema.sql                    # Production PostgreSQL DDL table definitions
│   │   └── seed.sql                      # Sample data for development verification
│   ├── src/
│   │   ├── app.ts                        # Express application assembly & middleware setup
│   │   ├── server.ts                     # HTTP listener & database connection bootstrapper
│   │   ├── config/                       # Environment variables & PostgreSQL connection pool
│   │   ├── controllers/                  # Route handlers for auth, loans, summary, and health
│   │   ├── middlewares/                  # JWT authentication, error handling, Zod validation
│   │   ├── routes/                       # Express router modules
│   │   ├── services/                     # Business logic (Loan calculations, OTP verification)
│   │   ├── types/                        # Core TypeScript interfaces & request extensions
│   │   └── validators/                   # Zod schemas for input validation
│   └── tests/                            # Automated test suite (40 tests across 4 suites)
│       ├── tsconfig.json                 # Isolated TypeScript config for test runners
│       ├── setup.ts                      # Test harness & hermetic pg-mem database setup
│       ├── auth.test.ts                  # OTP lifecycle, attempt limits, expiration tests
│       ├── loans.test.ts                 # Loan CRUD, tenant isolation, and repayment tests
│       ├── summary.test.ts               # Overdue, repaid, and pending calculation tests
│       └── database.test.ts              # PostgreSQL constraint and integrity tests
│
└── mobile/                               # React Native Expo Mobile Application
    ├── package.json                      # Expo dependencies and testing scripts
    ├── app.json                          # Expo project metadata and plugins
    ├── tsconfig.json                     # Expo TypeScript configuration
    ├── jest.config.js                    # Jest configuration for client unit tests
    ├── App.tsx                           # Root navigation & auth state switch
    ├── __tests__/                        # Frontend unit test suites
    │   ├── validation.test.ts            # Form and input validation tests
    │   └── formatters.test.ts            # Currency, date, and overdue calculation tests
    └── src/
        ├── config/                       # Networking configuration and preset URL mappings
        ├── context/                      # React Context for session management (AuthContext)
        ├── services/                     # HTTP client (ApiService) & storage (StorageService)
        ├── types/                        # Client-side API request & response interfaces
        ├── theme/                        # Tailored light-theme financial color tokens
        ├── utils/                        # Currency, date, phone, and validation helpers
        ├── components/                   # Reusable UI components
        │   ├── StatusBadge.tsx           # Repaid / Overdue / Pending pill badges
        │   ├── SummaryCard.tsx           # Financial metric cards
        │   ├── LoanCard.tsx              # Loan item with mark-as-repaid action
        │   ├── AddLoanModal.tsx          # Validated loan creation modal
        │   └── NetworkConfigModal.tsx    # In-app server URL switcher & connection tester
        └── screens/                      # Mobile screens
            ├── LoginScreen.tsx           # Phone number input & OTP request
            ├── OtpScreen.tsx             # 6-digit verification code screen
            └── DashboardScreen.tsx       # Loan list, summary grid, and filtering
```

---

## 🗄 Database Schema & Relationships

The database is built on relational integrity and strict business constraints:

```mermaid
erDiagram
    users ||--o{ loans : "owns (1:N, ON DELETE CASCADE)"
    users ||--o{ otp_codes : "requests (1:N)"

    users {
        uuid id PK "gen_random_uuid()"
        varchar phone_number UK "Unique mobile number"
        timestamptz created_at "Defaults to CURRENT_TIMESTAMP"
        timestamptz updated_at "Defaults to CURRENT_TIMESTAMP"
    }

    otp_codes {
        uuid id PK "gen_random_uuid()"
        varchar phone_number "Recipient phone"
        varchar otp_code "6-digit verification string"
        timestamptz expires_at "Timestamp after which code is invalid"
        int attempts "Consecutive failure counter (default 0)"
        int max_attempts "Max allowed attempts before lockout (3)"
        boolean is_used "Single-use flag"
        timestamptz created_at "Creation timestamp"
    }

    loans {
        uuid id PK "gen_random_uuid()"
        uuid user_id FK "References users(id)"
        varchar friend_name "Borrower name (1-100 characters)"
        numeric amount "CHECK (amount > 0)"
        date due_date "Maturity date (YYYY-MM-DD)"
        boolean is_repaid "Repayment status flag"
        timestamptz repaid_at "Timestamp of repayment"
        text notes "Optional context notes"
        timestamptz created_at "Creation timestamp"
        timestamptz updated_at "Update timestamp"
    }
```

### Key Constraints & Indexes:
1. **Monetary Constraint**: `CHECK (amount > 0)` prevents negative or zero loans.
2. **Phone Number Uniqueness**: `UNIQUE (phone_number)` on `users` guarantees single identity per phone.
3. **Cascading Deletes**: `ON DELETE CASCADE` removes all associated loans when a parent user is deleted.
4. **Performance Indexes**:
   - `idx_loans_user_id` on `loans(user_id)` for sub-millisecond tenant isolation filtering.
   - `idx_loans_due_date` on `loans(due_date)` for fast overdue query evaluation.
   - `idx_otp_phone_unused` on `otp_codes(phone_number, is_used)` for active OTP lookups.

---

## ⚙ Environment Configuration

Create a `.env` file in the `backend/` directory by copying `.env.example`:

```bash
cp backend/.env.example backend/.env
```

| Variable | Description | Default Development Value |
| :--- | :--- | :--- |
| `PORT` | Local port for Express API | `5000` |
| `NODE_ENV` | Runtime environment (`development` / `production`) | `development` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/miniledger` |
| `JWT_SECRET` | Secret key used to sign and verify JSON Web Tokens | `your_secret_key_change_in_production` |
| `JWT_EXPIRES_IN`| Token validity duration | `7d` |
| `OTP_EXPIRY_MINUTES` | OTP lifetime before expiration | `5` |
| `OTP_MAX_ATTEMPTS` | Number of failed attempts before OTP is invalidated | `3` |

---

## 🐘 PostgreSQL Database Setup

### Option 1: Native PostgreSQL Installation
1. Install PostgreSQL 14+ on your system.
2. Open your terminal or `psql` console and create the database:
   ```sql
   CREATE DATABASE miniledger;
   ```
3. Initialize the schema:
   ```bash
   cd backend
   npm run db:init
   ```
4. (Optional) Populate sample seed data:
   ```bash
   npm run db:seed
   ```

### Option 2: Docker Container
```bash
docker run --name miniledger-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=miniledger \
  -p 5432:5432 -d postgres:15-alpine

cd backend
npm run db:init
npm run db:seed
```

### Option 3: Zero-Setup Embedded Engine (Development Fallback)
If you do not have PostgreSQL installed locally, you can start the backend directly (`npm run dev`). MiniLedger will detect that native PostgreSQL is offline and automatically initialize an in-memory PostgreSQL engine (`pg-mem`) loaded with the full schema and seed data.

---

## 🏁 Getting Started

### Backend Setup & Execution

1. Navigate to the backend directory and install dependencies:
   ```bash
   cd backend
   npm install
   ```

2. Run TypeScript compilation to verify project health:
   ```bash
   npm run build
   ```

3. Start the backend development server:
   ```bash
   npm run dev
   ```
   The server will start at `http://localhost:5000`. Keep this terminal window open so you can view the printed OTP codes.

---

### Mobile Application Setup & Execution

1. Open a new terminal, navigate to the `mobile/` directory, and install dependencies:
   ```bash
   cd mobile
   npm install
   ```

2. Start the Expo development bundler:
   ```bash
   npx expo start
   ```

3. Launch on your device or emulator:
   - **Physical Android Phone**: Install **Expo Go** from Google Play Store, connect to the same Wi-Fi network as your computer, and scan the terminal QR code.
   - **Android Emulator**: Press `a` in the terminal to launch on a running Android Studio emulator.
   - **Web Browser**: Press `w` in the terminal to launch the web preview.

---

## 🔑 Mock OTP Authentication Workflow

MiniLedger uses a passwordless login flow. In development mode, mock OTPs are logged directly to the server terminal:

```text
======================================================
[MOCK OTP SERVICE] Verification Code Generated
Phone: +919876543210
Code:  648291
Valid: 5 minutes (Max attempts: 3)
======================================================
```

### How to Authenticate:
1. Open the mobile app.
2. Enter your phone number (e.g., `+919876543210`).
3. Tap **Send Verification Code**.
4. Check the terminal where `npm run dev` is running for the 6-digit `Code: XXXXXX`.
5. Enter the code into the mobile app and tap **Verify & Continue**.

---

## 📡 REST API Documentation

### 1. Health & Status
- **`GET /api/health`**
  - **Public**: Yes
  - **Response (200 OK)**:
    ```json
    {
      "status": "ok",
      "uptime": 128.45,
      "timestamp": "2026-10-21T15:30:00.000Z",
      "services": {
        "api": "healthy",
        "database": "connected"
      }
    }
    ```

---

### 2. Authentication
- **`POST /api/auth/request-otp`**
  - **Public**: Yes
  - **Request Body**:
    ```json
    {
      "phone": "+919876543210"
    }
    ```
  - **Response (200 OK)**:
    ```json
    {
      "success": true,
      "message": "OTP sent successfully. Please check server console logs for the mock OTP code."
    }
    ```

- **`POST /api/auth/verify-otp`**
  - **Public**: Yes
  - **Request Body**:
    ```json
    {
      "phone": "+919876543210",
      "otp": "648291"
    }
    ```
  - **Response (200 OK)**:
    ```json
    {
      "success": true,
      "message": "Authentication successful",
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "id": "11111111-1111-1111-1111-111111111111",
        "phone_number": "+919876543210"
      }
    }
    ```

---

### 3. Financial Summary
- **`GET /api/summary`**
  - **Headers**: `Authorization: Bearer <token>`
  - **Response (200 OK)**:
    ```json
    {
      "success": true,
      "data": {
        "total_lent": 6500,
        "total_repaid": 2000,
        "overdue_amount": 3000,
        "pending_amount": 4500
      }
    }
    ```

---

### 4. Loan Management
- **`GET /api/loans`**
  - **Headers**: `Authorization: Bearer <token>`
  - **Query Parameters**: `status` (optional: `all`, `pending`, `overdue`, `repaid`)
  - **Response (200 OK)**:
    ```json
    {
      "success": true,
      "count": 2,
      "data": [
        {
          "id": "aaaa1111-1111-1111-1111-111111111111",
          "user_id": "11111111-1111-1111-1111-111111111111",
          "friend_name": "Rahul Sharma",
          "amount": 1500,
          "due_date": "2026-11-20",
          "is_repaid": false,
          "repaid_at": null,
          "notes": "Concert ticket",
          "created_at": "2026-10-21T12:00:00.000Z",
          "updated_at": "2026-10-21T12:00:00.000Z",
          "is_overdue": false
        }
      ]
    }
    ```

- **`POST /api/loans`**
  - **Headers**: `Authorization: Bearer <token>`
  - **Request Body**:
    ```json
    {
      "friend_name": "Priya Patel",
      "amount": 3000,
      "due_date": "2026-12-15",
      "notes": "Trip flight tickets"
    }
    ```
  - **Response (201 Created)**:
    ```json
    {
      "success": true,
      "message": "Loan entry created successfully",
      "data": {
        "id": "7e1beb59-be21-4d76-8156-6ea421fbf697",
        "friend_name": "Priya Patel",
        "amount": 3000,
        "due_date": "2026-12-15",
        "is_repaid": false
      }
    }
    ```

- **`PATCH /api/loans/:id/repay`**
  - **Headers**: `Authorization: Bearer <token>`
  - **Response (200 OK)**:
    ```json
    {
      "success": true,
      "message": "Loan marked as repaid successfully",
      "data": {
        "id": "7e1beb59-be21-4d76-8156-6ea421fbf697",
        "is_repaid": true,
        "repaid_at": "2026-10-21T15:35:10.000Z"
      }
    }
    ```

---

## 🧪 Automated Testing

MiniLedger includes 64 automated tests covering backend API contracts, security checks, and client validation:

```bash
# Run all backend automated tests (40 tests)
cd backend
npm test

# Run all frontend unit tests (24 tests)
cd mobile
npm test
```

### Test Suite Summary:
- **`backend/tests/auth.test.ts` (10 tests)**: Verifies OTP generation, single-use, 3-strike attempt lockouts, expiration, and error handling.
- **`backend/tests/loans.test.ts` (20 tests)**: Verifies JWT authentication enforcement, input validation, tenant isolation, and repayment rules.
- **`backend/tests/summary.test.ts` (2 tests)**: Verifies financial summation, overdue calculation rules, and cross-tenant data isolation.
- **`backend/tests/database.test.ts` (8 tests)**: Verifies PostgreSQL constraints (`CHECK amount > 0`, `UNIQUE phone`, cascading foreign keys).
- **`mobile/__tests__/validation.test.ts` (14 tests)**: Verifies client-side form validation (phone formats, amounts, valid calendar dates).
- **`mobile/__tests__/formatters.test.ts` (10 tests)**: Verifies currency formatting, date transformations, and relative overdue days.

---

## 🔧 Troubleshooting & Mobile Networking

### Mobile Device Networking (Localhost vs LAN)
> **Why `localhost` does not work on mobile devices**:
> On a physical phone or an Android emulator, `localhost` (127.0.0.1) refers to the **mobile device itself**, not your development computer.

1. **Testing on a Physical Phone (Expo Go)**:
   - Ensure your phone and development computer are connected to the **same Wi-Fi network**.
   - In the mobile app, tap the **Wi-Fi icon** in the top header to open the Network Configuration modal.
   - Choose the **Physical Phone (Wi-Fi LAN)** preset or enter your computer's IP (e.g., `http://192.168.x.x:5000/api`).
   - Tap **Test Connection** to confirm connectivity.

2. **Testing on Android Studio Emulator**:
   - In the mobile app, tap the Wi-Fi icon and select **Android Emulator (`http://10.0.2.2:5000/api`)**.
   - `10.0.2.2` is Android's built-in alias to the host computer loopback interface.

---

## 🛡 Security Considerations & Known Limitations

### Security Features
- **Strict Tenant Isolation**: All database queries are scoped to the authenticated user ID (`WHERE user_id = $1`). Users cannot view or modify other users' loans.
- **Parameterized Queries**: All database interactions use parameter substitution (`$1, $2`) to eliminate SQL injection vulnerabilities.
- **Encrypted Local Storage**: Sensitive auth tokens are stored using `expo-secure-store`, preventing token extraction from backups or app storage.
- **Single-Use OTPs & Lockout**: OTPs expire in 5 minutes, become invalid after 3 failed attempts, and are invalidated immediately upon use.
- **No Token/Secret Leakage**: The `/api/auth/request-otp` endpoint never returns the OTP in response payloads.

### Known Limitations
1. **SMS Provider**: The application uses a console-logged mock OTP service for development rather than an SMS gateway (e.g., Twilio or AWS SNS).
2. **Currency**: Monetary values currently format in Indian Rupees (`₹` / INR). Multi-currency conversion is not supported.

---

## 📋 Internship Submission Checklist

- [x] **Project Overview & Documentation**: Comprehensive README with Mermaid architecture diagram.
- [x] **Backend Implementation**: Node.js, Express, TypeScript, Zod, and PostgreSQL.
- [x] **Relational Database**: PostgreSQL constraints (`amount > 0`, `unique phone_number`, foreign keys).
- [x] **Automated Test Coverage**: 40 backend tests and 24 mobile tests passing cleanly.
- [x] **Mobile Client**: React Native with Expo, clean financial light theme, pull-to-refresh, and loan creation modal.
- [x] **Configurable Networking**: In-app base URL switcher supporting emulators, LAN Wi-Fi, and localhost.
- [x] **Security Audit**: `.env` and sensitive files excluded from Git; secure token storage implemented.
