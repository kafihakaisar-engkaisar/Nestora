<div align="center">

# 🏠 Nestora - Smart PG Management Platform & AI Assistant

[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org)
[![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white)](https://www.mysql.com)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com)

**A next-generation, full-stack Paying Guest (PG) management platform with role-aware portals, automated rent tracking, and an intelligent multi-lingual AI chatbot assistant.**

[Features](#-key-features) • [Project Overview](#-about-nestora) • [Architecture](#-architecture--pillars) • [Installation](#-quick-start) • [Vercel Deployment](#-deploy-to-vercel)

</div>

---

## 📖 About Nestora

Finding and managing Paying Guest (PG) accommodations is traditionally fragmented, relying on manual paper registers, unverified phone listings, scattered rent receipts, and disjointed communication between owners and tenants.

**Nestora** is an end-to-end web platform designed to streamline the entire PG lifecycle:
- **For Tenants**: A friction-free discovery and living experience — explore verified PGs with interactive nearby essentials (hospitals, grocery, transit), submit join requests, pay monthly rent digitally, download verified receipts, raise maintenance complaints, and get instant answers from an AI assistant.
- **For PG Owners**: An all-in-one operational hub — manage multiple properties, monitor live room/bed occupancy, evaluate incoming tenant requests with single-click approvals, broadcast community notices, track rent collections, and resolve maintenance tickets.
- **For Platform Administrators**: Complete ecosystem oversight — inspect user directories, verify newly listed PG properties, resolve platform reports and glitches, and review financial analytics.
- **For Everyone**: An embedded **Nestora AI Robot** that speaks **English, Hindi, and Hinglish**, capable of analyzing database records in real time to answer questions about vacancies, dues, rent statuses, and rules.

---

## 🏛️ Architecture & Pillars

```mermaid
flowchart TD
    subgraph Client ["Client Layer (Responsive Web Portals)"]
        T["Tenant Portal\n(tenant.html)"]
        O["Owner Portal\n(owner.html)"]
        A["Admin Portal\n(admin.html)"]
        R["AI Robot Assistant\n(robot.js / Voice & Chat)"]
    end

    subgraph Security ["Security & Auth Layer"]
        JWT["JWT Bearer Token Auth"]
        Bcrypt["Bcrypt Password Hashing"]
        Isolation["Strict Role & Data Isolation"]
    end

    subgraph API ["Serverless Backend (FastAPI / api/index.py)"]
        AuthRoutes["Auth & Profile APIs"]
        PGRoutes["PG Search, Map & Rooms APIs"]
        TenantRoutes["Join, Leave & Booking APIs"]
        PaymentRoutes["Rent, Invoices & Receipt APIs"]
        ComplaintRoutes["Complaints & Notices APIs"]
        ChatbotRoutes["Role-Aware NLP & Action APIs"]
    end

    subgraph Data ["Database Layer"]
        MySQL[("MySQL 8.0+ / Cloud DB\nUsers • PGs • Rooms • Bookings • Payments • Complaints")]
    end

    Client --> Security
    Security --> API
    API --> Data
```

---

## 🌟 Key Features

### 👤 1. Tenant Portal (`tenant.html`)
- **Smart PG Search & Discovery**: Search PGs by city, neighborhood, landmark, or PIN code with filters for budget, gender suitability, and room sharing types.
- **Interactive Maps & Essentials**: Integrated map engine displaying nearby hospitals, grocery stores, pharmacies, gyms, and transport hubs.
- **Join Requests & Bookings**: Submit join requests to PG owners with real-time status updates (*Pending*, *Approved*, *Rejected*).
- **Rent Payments & Digital Receipts**: Pay monthly rent digitally and generate, view, and print official invoices/receipts.
- **Maintenance Complaints**: Raise categorized maintenance issues and track owner resolution statuses.
- **Property Reviews**: Rate and review PGs to help future tenants.
- **Profile & Account Security**: Update personal contact details, residential address, and change account passwords securely.
- **App Bug Reports**: Submit bug reports and feature requests directly to system administrators.

### 🏢 2. PG Owner Portal (`owner.html`)
- **Property Management**: Register and manage multiple PG properties with photos, amenities, pricing, rules, and address coordinates.
- **Rooms & Beds Management**: Create and manage rooms with specific bed numbers, sharing types, and live vacancy status.
- **Tenant Request Workflow**: Review incoming tenant join requests and approve or reject them with a single click.
- **Active Occupancy Tracking**: Monitor allocated tenants, bed allocations, and move-in dates.
- **Payment & Rent Tracking**: View live rent collection records, pending dues, and payment histories.
- **Notice Broadcasting**: Publish property-wide announcements that appear instantly on all tenants' dashboards.
- **Complaint Resolution**: Inspect and update the status of tenant maintenance complaints.
- **Owner Profile & Security**: Manage personal and office details and update passwords.

### 🛡️ 3. Admin Portal (`admin.html`)
- **Platform Analytics**: Dashboard metrics tracking registered PGs, verified properties, total tenants, active owners, and revenue.
- **User Management**: Inspect full tenant and owner directories, account credentials, and platform activity.
- **PG Verification**: Review newly registered PG properties and approve or verify listings.
- **System Complaints & App Reports**: Centralized issue tracker for platform bugs, user reports, and feature requests with status management and resolution tools.
- **Operational Reports**: Instant analytical summaries of business metrics, occupancy rates, and revenue.

### 🤖 4. Nestora AI Robot Assistant (`robot.js`)
- **Floating AI Assistant**: Modern, animated widget accessible across all portals.
- **Multi-Lingual NLP**: Understands natural language queries in **English**, **Hindi**, and **Hinglish** (e.g., *"Sakchi me ₹8,000 ke andar girls PG chahiye"*, *"Mera rent kitna hai?"*).
- **Role-Aware Context**: Automatically personalizes responses based on whether the logged-in user is a Tenant, an Owner, or a Visitor.
- **Verified Database Access**: Fetches real-time PG vacancies, booking statuses, dues, and payment records.
- **Voice Interaction**: Built-in Speech-to-Text voice search and Text-to-Speech audio replies.
- **Interactive Safe Actions**: Direct shortcuts to navigate portals, open receipt views, and prepare requests.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | HTML5, CSS3 (Modern Flexbox & CSS Grid), Vanilla JavaScript (ES6+) |
| **Backend** | Python FastAPI, Uvicorn, Pydantic V2 |
| **Database** | MySQL 8.0+ (compatible with MariaDB, TiDB, Aiven, and Railway MySQL) |
| **Security** | JWT (JSON Web Tokens), Native Bcrypt Password Hashing, Role Isolation |
| **Deployment** | Vercel Serverless Functions (`@vercel/python`) & Vercel Edge Network |

---

## 📁 Project Directory Structure

```text
Nestora/
├── api/
│   └── index.py            # Vercel Serverless Function entry point
├── backend/
│   ├── __init__.py
│   └── main.py             # FastAPI backend (87+ authenticated REST APIs)
├── database/
│   └── schema.sql          # Complete MySQL schema & initial seed data
├── frontend/
│   ├── index.html          # Welcome & landing page
│   ├── tenant.html         # Tenant dashboard & search portal
│   ├── owner.html          # PG Owner management portal
│   ├── admin.html          # Platform Administrator portal
│   ├── tenant-auth.html    # Tenant sign-in & sign-up
│   ├── owner-auth.html     # Owner sign-in & sign-up
│   ├── admin-auth.html     # Admin sign-in
│   ├── app.js              # Core frontend business logic & API bindings
│   ├── robot.js            # Nestora AI Robot assistant engine
│   └── style.css           # Global stylesheet & responsive design system
├── .env.example            # Environment variables template
├── .gitignore              # Git ignore rules
├── requirements.txt        # Python backend dependencies
├── VERCEL.md               # Detailed Vercel deployment guide
├── vercel.json             # Vercel serverless build & routing configuration
└── README.md
```

---

## 🚀 Quick Start (Local Setup)

### 1. Clone the Repository
```bash
git clone https://github.com/kafihakaisar-engkaisar/Nestora.git
cd Nestora
```

### 2. Set Up MySQL Database
1. Open your MySQL terminal or GUI (phpMyAdmin, MySQL Workbench, DBeaver).
2. Execute the schema script:
   ```sql
   SOURCE database/schema.sql;
   ```

### 3. Configure & Run Backend
Create and activate a virtual environment:
```bash
# Windows
python -m venv backend/venv
.\backend\venv\Scripts\activate

# Linux / macOS
python3 -m venv backend/venv
source backend/venv/bin/activate
```

Install dependencies:
```bash
pip install -r requirements.txt
```

Start the FastAPI server:
```bash
uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```
API Documentation will be live at `http://127.0.0.1:8000/docs`.

### 4. Launch Frontend
Open `frontend/index.html` in your web browser (or run with Live Server in VS Code):
```text
http://127.0.0.1:5500/frontend/index.html
```

---

## 🌐 Deploy to Vercel

Nestora is pre-configured with `vercel.json` and `api/index.py` for full-stack deployment on Vercel:

1. Go to **[vercel.com/new](https://vercel.com/new)**.
2. Select your imported **`Nestora`** repository.
3. Under **Project Settings** ➔ **Environment Variables**, add your cloud MySQL connection:
   - `DATABASE_URL`: `mysql://username:password@host:port/database_name`
   *(or `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`)*
4. Click **Deploy**. Vercel will host both your frontend static pages and Python backend serverless functions globally!

*Refer to [VERCEL.md](VERCEL.md) for full cloud database guides (Aiven, TiDB, Railway).*

---

## 🔒 Security & Data Isolation
- **Role Isolation**: Tenant, Owner, and Admin portals authenticate independently to prevent cross-role impersonation.
- **Bcrypt Hashing**: Passwords are cryptographically salted and hashed.
- **JWT Authorization**: All database mutations and sensitive operations require a verified JSON Web Token.

---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).

