# 🚀 0$/month Deployment Guide (The Free Split Stack)

This guide walks you through moving your application from Render to a completely free split-stack architecture, utilizing standard free tiers that don't expire.

## 🏗️ The Architecture
1. **Database:** Neon.tech or Supabase (Free PostgreSQL)
2. **Backend API:** Koyeb (Free Node.js / Docker container)
3. **Frontend Web:** Vercel or Cloudflare Pages (Free static hosting)

---

## Step 1: Set up the Database (Neon.tech or Supabase)
Render hosted your PostgreSQL database. We need to move this to a free provider. 

**Instructions:**
1. Go to [Neon.tech](https://neon.tech) (highly recommended for pure Postgres) or [Supabase.com](https://supabase.com).
2. Create a new free project/database.
3. Once created, find your **Connection String** (it starts with `postgresql://...`).
4. Keep this string safe. This is your new `DATABASE_URL`.

*(Optional Data Migration)*: If you need to keep your old Render data, you can use `pg_dump` to export from Render and `psql` to import to Neon. Otherwise, you can just run your migrations on the new database.

---

## Step 2: Set up the Backend (Koyeb)
Because you already have a `Dockerfile` in your `backend/` folder (from your `render.yaml`), deploying to Koyeb is extremely similar to Render.

**Instructions:**
1. Go to [Koyeb.com](https://koyeb.com) and create an account.
2. Click **Create Web Service**.
3. Choose **GitHub** as the deployment method and select your repository.
4. **Configure the Service:**
   - **Builder:** Choose "Dockerfile". Set the Dockerfile location to `backend/Dockerfile` and Context to `backend`.
   - **Instance Type:** Select the **Free Eco "Nano" instance** (512MB RAM).
   - **Environment Variables:** Add all the exact same variables you had in your `render.yaml`:
     - `NODE_ENV` = `production`
     - `DATABASE_URL` = *(Paste the URL from Step 1)*
     - `JWT_SECRET`, `SESSION_SECRET`, `ENCRYPTION_KEY`, etc.
5. Click **Deploy**. Koyeb will build your Docker image and provide you with a public URL (e.g., `https://your-app-name.koyeb.app`).

> ⚠️ **Important Note on File Uploads:** I noticed in your `render.yaml` you used a persistent disk for `/app/uploads`. Koyeb's free tier does not currently offer permanent local disks. This means if you upload a logo to your `/app/uploads` folder, it will disappear if Koyeb restarts the container. To fix this, you should eventually migrate your image upload logic to use a free cloud storage bucket (like **Supabase Storage** or **AWS S3 Free Tier**) instead of saving images locally.

---

## Step 3: Set up the Frontend (Vercel)
Finally, we host the React/Vite frontend.

**Instructions:**
1. Go to [Vercel.com](https://vercel.com) and sign in with GitHub.
2. Click **Add New Project** and select your repository.
3. Ensure the Framework Preset is set to **Vite**.
4. Expand the **Environment Variables** section.
5. Add the variable your frontend uses to talk to the backend (likely `VITE_API_URL`), and set its value to your new Koyeb Backend URL (e.g., `https://your-app-name.koyeb.app`).
6. Click **Deploy**.

---

## Step 4: Run Migrations
Once your Koyeb backend is live and connected to your Neon database, you need to run your database setup scripts.

You can do this by using the Web Terminal inside the Koyeb dashboard for your service and running:
```bash
node scripts/deploy-migrations.js
```
*(Or whatever script you normally run to sync your Sequelize models).*

## Summary Checklist
- [ ] Database migrated to **Neon.tech** ($0/mo)
- [ ] Backend API running on **Koyeb** ($0/mo, 24/7 uptime)
- [ ] Frontend running on **Vercel** ($0/mo, edge CDN)
- [ ] All environment variables updated
- [ ] Migrations run on the new system
