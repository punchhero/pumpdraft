# Phase 6: Deployment Guide

## Step 1: Push to GitHub

### 1.1 Create a GitHub Repository
1. Go to [github.com/new](https://github.com/new)
2. Name it **polynator** (or whatever you want)
3. Set it to **Public** or **Private**
4. **Do NOT** check "Add a README" (we already have code)
5. Click **Create repository**

### 1.2 Push Your Code
Open a terminal in `c:\Users\Voronovskiy\Desktop\polynator` and run:

```bash
# Make sure you're in the project directory
# Add all files to git
git add .

# Commit
git commit -m "POLYNATOR v1.0 — Initial release"

# Connect to your GitHub repo (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/polynator.git

# Push
git branch -M main
git push -u origin main
```

> If you haven't configured git before, run these first:
> ```bash
> git config --global user.name "Your Name"
> git config --global user.email "your@email.com"
> ```

---

## Step 2: Deploy to Vercel (Free)

### 2.1 Create a Vercel Account
1. Go to [vercel.com](https://vercel.com)
2. Click **Sign Up** → **Continue with GitHub**
3. Authorize Vercel to access your GitHub

### 2.2 Import Your Project
1. Click **"Add New..."** → **Project**
2. Find **polynator** in the list and click **Import**
3. Vercel auto-detects it as a Next.js project ✓

### 2.3 Add Environment Variables
Before clicking Deploy, expand **Environment Variables** and add:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `your-anon-key` |
| `SUPABASE_SERVICE_ROLE_KEY` | `your-service-role-key` |

> Skip this if you haven't set up Supabase yet — the app works without it.

### 2.4 Deploy!
1. Click **Deploy**
2. Wait ~1-2 minutes
3. Vercel gives you a live URL like: `https://polynator-xxx.vercel.app`

### 2.5 Auto-Deploy on Every Push
Once connected, every time you push to GitHub, Vercel auto-deploys. Just:
```bash
git add .
git commit -m "your changes"
git push
```

---

## Step 3: Custom Domain (Hostinger → Vercel)

### 3.1 Add Domain in Vercel
1. Go to your Vercel project → **Settings** → **Domains**
2. Type your domain (e.g. `polynator.com`) and click **Add**
3. Vercel will show you DNS records to add

### 3.2 Configure DNS in Hostinger
1. Log into [Hostinger](https://hpanel.hostinger.com)
2. Go to **Domains** → click your domain → **DNS / Nameservers**
3. Add these DNS records:

**For root domain** (`polynator.com`):
| Type | Name | Value |
|------|------|-------|
| A | @ | `76.76.21.21` |

**For www subdomain** (`www.polynator.com`):
| Type | Name | Value |
|------|------|-------|
| CNAME | www | `cname.vercel-dns.com` |

4. Delete any existing A or CNAME records that conflict
5. Save changes
6. Wait 10-30 minutes for DNS to propagate

### 3.3 Verify in Vercel
Go back to Vercel → Settings → Domains. It should show a green checkmark ✓ next to your domain. SSL certificate is auto-generated (HTTPS ready).

---

## Checklist Before Going Live

- [ ] Supabase project created + Web3 auth enabled
- [ ] SQL schema + functions run in Supabase SQL Editor
- [ ] `.env.local` filled with real Supabase credentials
- [ ] Environment variables added to Vercel
- [ ] Token CA updated in `Footer.tsx`
- [ ] Pump.fun, Twitter, GitHub URLs updated in `Footer.tsx`
- [ ] Custom domain DNS configured (if applicable)
