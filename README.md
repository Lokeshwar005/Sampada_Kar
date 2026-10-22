# Sampada Kar (सम्पदा कर) – Property Tax Management & Payment Portal

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61dafb.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646cff.svg)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8.svg)](https://tailwindcss.com/)
[![Node.js](https://img.shields.io/badge/Node.js-22.x-339933.svg)](https://nodejs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748.svg)](https://www.prisma.io/)
[![Socket.IO](https://img.shields.io/badge/WebSockets-Socket.IO-010101.svg)](https://socket.io/)
[![Razorpay](https://img.shields.io/badge/Payments-Razorpay%20TEST-0C2340.svg)](https://razorpay.com/)

A production-style, deployable full-stack web application designed for an Indian Municipal Corporation. It replaces paper-based property tax processes (register books, demand notices, paper receipts, and arrears ledgers) with a real-time, multi-user, auditable digital system.

---

## 🏛️ System Architecture

```
                    ┌──────────────────────────────────────────────┐
                    │      React + Vite + Tailwind CSS Frontend    │
                    │   (Citizen Portal, Officer Desk, Admin HQ)   │
                    └──────────────────────┬───────────────────────┘
                                           │
                    ┌──────────────────────┴───────────────────────┐
                    │    REST API (JSON)  &  WebSockets (Socket.IO)│
                    └──────────────────────┬───────────────────────┘
                                           │
                    ┌──────────────────────▼───────────────────────┐
                    │              Express + Node.js API           │
                    │  ├── Deterministic Pure Tax Engine           │
                    │  ├── JWT Auth & Role Isolation Guards        │
                    │  ├── Audit Trail & Live Event Broadcaster    │
                    │  └── Razorpay Gateway + Mock Fallback        │
                    └──────────────────────┬───────────────────────┘
                                           │
                    ┌──────────────────────▼───────────────────────┐
                    │          Prisma ORM (SQLite / PostgreSQL)    │
                    │  ├── Properties & Ownership History Ledgers  │
                    │  ├── Tax Rates, Age Bands & Exemptions       │
                    │  ├── Payments, Receipts & Instalment Plans   │
                    │  └── Transfers, Reassessments & Grievances   │
                    └──────────────────────────────────────────────┘
```

---

## 🔑 Demo Personas & Credentials

The portal features an instant **1-Click Demo Persona Switcher** in the top navigation bar, as well as manual login credentials:

| Role | Persona Name | Email / Identifier | Mobile | Password | Jurisdiction / Special Flag |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Citizen** | Rajesh Kumar Verma | `citizen.rajesh@gmail.com` | `9876543213` | `CitizenPassword@123` | Residential owner (Worked Example) |
| **Senior Citizen** | Shrimati Saraswati Devi | `senior.shrimati@gmail.com` | `9876543214` | `CitizenPassword@123` | **Senior Citizen Flag (10% Rebate)** |
| **Ward Officer** | Sunil Sharma | `officer.sharma@sampadakar.gov.in` | `9876543211` | `OfficerPassword@123` | **Assigned to Wards W-01 & W-02** |
| **Ward Officer 2** | Pooja Patel | `officer.patel@sampadakar.gov.in` | `9876543212` | `OfficerPassword@123` | Assigned to Wards W-03 & W-04 |
| **Super Admin** | Vikramaditya Joshi | `admin@sampadakar.gov.in` | `9876543210` | `AdminPassword@123` | Municipal Commissioner (Full Access) |

---

## 📦 19 Complete Modules

### Core Modules
1. **Public Portal & Live Stats**: "Check Your Tax" lookup by Property ID (no login required) with immediate line-by-line breakdown and live municipal statistics.
2. **Citizen Registration & Login**: Validation for 10-digit Indian mobile numbers (`^[6-9]\d{9}$`), password confirmation, and Senior Citizen (Age 60+) self-declaration.
3. **Property Register CRUD**: Search and filter by ward, property type, status, and ownership history; live dynamic tax preview during editing.
4. **Tax Settings & Parameters**: Base rates per sq ft by category, age band depreciation discounts, early bird rebate %, senior citizen rebate %, late payment penalties, and due dates.
5. **Payment & Receipts**: Full itemized breakdown, unique receipt sequence (e.g. `ST-2026-0001`), printable/PDF receipt with amount in Indian currency words (e.g., *"Rupees Nine Thousand One Hundred Twenty Only"*).
6. **Defaulters & Arrears**: Auto-detected overdue accounts with 18% annual arrears interest; printable statutory Form No. 12 Demand Notice with a strict 15-day compliance deadline.
7. **Reports & Analytics**: 8 Municipal KPI cards, interactive collection charts by ward, paid vs pending distribution, revenue split by category, and CSV export.
8. **Grievance Redressal**: Citizen ticketing system (Billing issues, measurement discrepancies, name corrections) with Open, In Progress, and Resolved tracking.
9. **About & Help**: Comprehensive FAQ, statutory regulations, and verified worked mathematical example.

### Extension Modules
10. **Property Transfer (Mutation)**: Applications for Sale Deed, Gift, or Inheritance. Upon approval, automatically closes previous owner's history ledger and opens the new owner record.
11. **Reassessment Requests**: Citizens propose revised area or category with before/after tax impact preview. Ward officers review and approve/reject (with mandatory reason).
12. **Rebates & Exemptions**: Itemized line-by-line rebates; list of statutory exempt categories (places of worship, government schools, public dispensaries).
13. **Quarterly Instalments**: 2 or 4 quarterly instalments scheduled 3 months apart with rounding on the final part and individual official receipts.
14. **Real-time Notifications**: Bell icon with unread count, targeted to user or role, pushed instantly via WebSockets without page reload.
15. **Officer Management**: Admin creates ward revenue officers, allocates ward numbers, and reviews ward coverage matrix.
16. **User Management**: Administrative soft-control (suspend/restore accounts; accounts are never permanently deleted to preserve auditability).
17. **Audit Log**: Immutable ledger of every state-changing mutation with timestamp, IP address, user role, entity, and CSV export.
18. **Citizen Feedback**: 5-star ratings and remarks tied to completed payments or resolved grievance tickets.
19. **Year-Wise Tax Archive**: Historical rate schedules and rebate rules from 2022 to the current year with printable reports.

---

## 🧮 Tax Calculation Engine (Single Source of Truth)

The tax engine is a pure, deterministic mathematical module (`server/src/tax/taxEngine.ts`):

$$\text{Base Tax} = \text{Built-up Area (sq ft)} \times \text{Rate}(\text{Category})$$
$$\text{Net Tax} = \text{Base Tax} - \text{Age Discount Amount}$$
$$\text{Total Payable} = \text{Net Tax} - \text{Early Rebate} - \text{Senior Rebate} + \text{Late Penalty} + \text{Arrears} + \text{Arrear Penalty}$$

*Note: For exempt properties ($\text{isExempt} = \text{true}$), $\text{Total Payable} = ₹0.00$.*

### Verified Benchmark (Passes Automated Unit Tests)
- **Built-up Area**: 1,500 sq ft @ ₹8.00/sq ft (Residential) = **₹12,000.00**
- **Age Discount (20 years old, 16–30 band @ 20%)**: -₹2,400.00 $\rightarrow$ **Net Tax: ₹9,600.00**
- **5% Early Bird Rebate**: -₹480.00 $\rightarrow$ **Total Payable: ₹9,120.00** (*Rupees Nine Thousand One Hundred Twenty Only*)
- **1 Month Late (2% monthly penalty on Net Tax)**: +₹192.00 $\rightarrow$ **Total Payable: ₹9,792.00** (*Rupees Nine Thousand Seven Hundred Ninety Two Only*)

---

## 🚀 Quickstart & Local Setup

### Prerequisites
- Node.js v18+ (tested on Node v22)
- npm v9+

### 1. Clone & Install Dependencies
```bash
# Clone the repository
git clone https://github.com/your-org/sampada-kar.git
cd "Sampada Kar"

# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
cd ..
```

### 2. Configure Environment Variables
In `server/`:
```bash
cp .env.example .env
```
Default `.env` configuration (Zero-config SQLite included):
```ini
PORT=5000
DATABASE_URL="file:./dev.db"
JWT_SECRET="sampada_kar_super_secret_jwt_key_2026_dev"
CORS_ORIGIN="http://localhost:5173"
RAZORPAY_KEY_ID=""
RAZORPAY_KEY_SECRET=""
```
*(If Razorpay keys are omitted, the application automatically uses the built-in municipal test gateway simulator).*

### 3. Initialize Database & Seed Demo Data
```bash
cd server
# Push Prisma schema to SQLite
npx prisma db push

# Seed 3 demo accounts, ~20 municipal properties, defaulters, payments, and workflow data
npm run prisma:seed
```

### 4. Run Automated Test Suite
```bash
# Runs 13 unit and integration tests (tax engine, auth isolation, payment verification)
npm test
```

### 5. Launch the Application
In separate terminal windows:
```bash
# Terminal 1: Backend Server (Port 5000)
cd server
npm run dev

# Terminal 2: Frontend Client (Port 5173)
cd client
npm run dev
```

Visit **http://localhost:5173** in your browser.

---

## 🚢 Production Deployment

### Option A: Docker & Docker Compose
A multi-stage `Dockerfile` and `docker-compose.yml` are included for containerized deployment:
```bash
# Build and run with Docker Compose
docker compose up --build -d
```
The application will be accessible at `http://localhost:5000`.

### Option B: Deploying to Render
1. Create a **Web Service** pointing to the repository root.
2. Root Directory: `server`.
3. Build Command: `npm install && npx prisma db push && npm run prisma:seed && npm run build`.
4. Start Command: `npm start`.
5. Environment Variables:
   - `DATABASE_URL`: `file:./dev.db` (or attach a Render PostgreSQL database URL)
   - `JWT_SECRET`: Generate a strong 64-character secret
   - `CORS_ORIGIN`: Your deployed frontend URL

### Option C: Deploying to Railway
1. Click **New Project** $\rightarrow$ **Deploy from GitHub repo**.
2. Add a **PostgreSQL** database service if desired.
3. In `schema.prisma`, change datasource provider to `postgresql` when using PostgreSQL:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
4. Set environment variables and deploy.

### Option D: Deploying Frontend to Vercel
1. Set Root Directory to `client`.
2. Framework Preset: `Vite`.
3. Build Command: `npm run build`.
4. Output Directory: `dist`.
5. Set `VITE_API_URL` to point to your deployed backend.

---

## 🧪 Automated Testing Verification

The project includes unit tests for the deterministic tax calculation engine and integration tests for role isolation and payment verification:

```
 RUN  v2.1.9 C:/Users/lokes/OneDrive/Desktop/Sampada Kar/server

 ✓ src/tax/taxEngine.test.ts (5 tests)
   ✓ passes the worked example with 5% early bird rebate (₹9,120)
   ✓ passes the worked example with 1 month late penalty (₹9,792)
   ✓ exempt properties result in ₹0 payable immediately
   ✓ applies senior citizen rebate for senior citizens on residential property
   ✓ calculates 4-part instalment plan with rounding on last part
 ✓ src/tests/integration.test.ts (8 tests)
   ✓ Health endpoint returns ONLINE
   ✓ Public Check-Your-Tax lookup works without authentication
   ✓ Role Guard: Citizen is blocked from accessing Admin User Management
   ✓ Role Guard: Citizen is blocked from accessing Defaulters List
   ✓ Role Isolation: Citizen only sees their own properties
   ✓ Role Isolation: Ward Officer only sees properties in assigned wards
   ✓ Admin can view all properties and reports dashboard
   ✓ Payment verification generates valid unique receipt with amount in words

 Test Files  2 passed (2)
      Tests  13 passed (13)
```

---

## 🏛️ Municipal Live-Demo Walkthrough

1. **Public Portal ("Check Your Tax")**:
   - Navigate to `/`. Enter `PROP-W01-1001` or click the demo chip.
   - Observe the live line-by-line tax breakdown (Base ₹12,000, 20% Age Discount -₹2,400, Net ₹9,600, 5% Early Rebate -₹480, Total ₹9,120).
   - Try `PROP-W01-TEMPLE` to verify 100% statutory exemption (₹0.00).

2. **Citizen Experience**:
   - Click **Demo Persona** $\rightarrow$ **Rajesh Verma**.
   - Review your properties, initiate a payment using the built-in simulator, and watch celebratory confetti trigger.
   - Click **View & Print Official Receipt** to examine receipt `ST-2026-XXXX` with amount in words.
   - Switch to **Ownership Transfer** tab and submit a transfer request.
   - Switch to **Reassessment** tab, type a new area, and view the real-time proposed tax preview.

3. **Ward Officer Experience**:
   - Click **Demo Persona** $\rightarrow$ **Sunil Sharma (Ward Officer W-01/02)**.
   - Notice you only see properties and applications belonging to Ward 01 and Ward 02.
   - Approve the transfer request submitted by Rajesh; verify that the ownership history row is updated.
   - Visit the **Defaulters** tab, review unpaid accounts, and click **Issue Demand Notice (15-Day)**.
   - Open and print the generated Statutory Form No. 12 Demand Notice.

4. **Municipal Administrator Experience**:
   - Click **Demo Persona** $\rightarrow$ **Vikramaditya (Admin)**.
   - Inspect the **8 KPI cards**, the **Ward Collection chart**, and the **Paid vs Pending split**.
   - Modify the residential base rate from ₹8 to ₹9 in **Tax Settings** $\rightarrow$ observe how all properties in the municipal registry are dynamically reassessed without manual re-entry.
   - Inspect the **Year-Wise Archive (2022–Present)**.
   - Review the **Ward Coverage matrix** and view the immutable **Audit Trail** with CSV export.

---

## 📜 License
Developed for Indian Municipal Corporations under the MIT License.
#   S a m p a d a _ K a r  
 