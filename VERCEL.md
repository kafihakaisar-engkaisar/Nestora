# 🚀 Deploying Nestora to Vercel

Nestora is now fully configured for deployment on **Vercel** with full-stack serverless architecture:
- **Frontend**: Static files (`index.html`, `owner.html`, `tenant.html`, `admin.html`, CSS, JS) served globally via Vercel Edge Network.
- **Backend**: FastAPI Python backend running as a Serverless Function via `api/index.py`.
- **Database**: Cloud MySQL connection support via standard environment variables (`DATABASE_URL` or `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`).

---

## Method 1: Deploy via GitHub (Recommended by Vercel)

1. **Create a GitHub Repository**:
   - Go to [github.com/new](https://github.com/new)
   - Name your repository (e.g. `nestora`) and create it.

2. **Push your code to GitHub**:
   Open PowerShell or Terminal in this folder and run:
   ```bash
   git add .
   git commit -m "Configure Nestora for Vercel deployment"
   git branch -M main
   git remote add origin https://github.com/YOUR_GITHUB_USERNAME/nestora.git
   git push -u origin main
   ```

3. **Deploy on Vercel**:
   - Go to [vercel.com/new](https://vercel.com/new)
   - Click **Import** next to your `nestora` repository.
   - Under **Framework Preset**, leave it as **Other**.
   - Under **Root Directory**, keep `./`.
   - Click **Deploy**!

---

## Method 2: Deploy directly via Vercel CLI

If you prefer deploying from your terminal:
1. Open PowerShell / Command Prompt in the `Nestora` directory.
2. Run:
   ```bash
   npx vercel
   ```
3. Follow the on-screen prompts:
   - *Log in with your browser or email.*
   - *Set up and deploy?* -> `Y`
   - *Which scope?* -> Select your personal account.
   - *Link to existing project?* -> `N`
   - *Project name?* -> `nestora`
   - *In which directory is your code located?* -> `./`
4. Once deployed, run:
   ```bash
   npx vercel --prod
   ```

---

## 🗄️ Setting Up the Database for Vercel

On local machines, MySQL runs on `localhost:3306`. Because Vercel functions run in the cloud, they need to connect to a cloud-hosted MySQL database.

### Free Cloud MySQL Providers:
- **Aiven MySQL** (Free tier available at [aiven.io](https://aiven.io))
- **TiDB Serverless** (Free 5GB MySQL-compatible database at [pingcap.com](https://pingcap.com))
- **Railway MySQL** (Free tier at [railway.app](https://railway.app))
- **Clever Cloud** (Free MySQL database at [clever-cloud.com](https://clever-cloud.com))

### Steps:
1. Create a MySQL database on one of the above providers.
2. Run the `database/schema.sql` file in your cloud database console to create the tables.
3. In your **Vercel Dashboard** -> Go to **Project Settings** -> **Environment Variables**.
4. Add either:
   - `DATABASE_URL`: `mysql://username:password@host:port/database_name`
   *OR individual variables:*
   - `DB_HOST`: Your cloud database host
   - `DB_USER`: Your database username
   - `DB_PASSWORD`: Your database password
   - `DB_NAME`: Your database name
   - `DB_PORT`: `3306` (or provided port)
   - `DB_SSL_DISABLED`: `false` (default)
