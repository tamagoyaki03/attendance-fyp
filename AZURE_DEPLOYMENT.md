# Azure Static Web Apps Deployment Guide

## Quick Start (5 Steps)

### Step 1: Create Azure Account (if you don't have one)
- Go to [Azure Portal](https://portal.azure.com)
- Sign up (free $200 credit for 30 days)
- No credit card required for free tier

### Step 2: Create Static Web App in Azure

1. Open [Azure Portal](https://portal.azure.com)
2. Click **Create a resource**
3. Search for **"Static Web App"** → Click **Create**

**Fill in the form:**
- **Subscription**: Select your subscription
- **Resource Group**: Click "Create new" → Name it `attendance-fyp-rg`
- **Static Web App name**: `attendance-fyp` (must be globally unique)
- **Plan type**: **Free**
- **Region**: Choose closest to you (e.g., East US 2, West Europe, Southeast Asia)
- **Deployment source**: **GitHub**

4. Click **Sign in with GitHub** → Authorize Azure

**GitHub Repository Details:**
- **Organization**: `tamagoyaki03`
- **Repository**: `attendance-fyp`
- **Branch**: `main`

**Build Details:**
- **Build Presets**: Select **React**
- **App location**: `/` (leave as default)
- **Api location**: (leave empty)
- **Output location**: `dist`

5. Click **Review + Create** → **Create**

**Wait 2-3 minutes** - Azure will:
- Create the Static Web App resource
- Add a workflow file to your GitHub repo
- Start the first deployment automatically

### Step 3: Add Environment Variables to GitHub

Your app needs Supabase credentials. Add them to GitHub Secrets:

1. Go to your GitHub repo: `https://github.com/tamagoyaki03/attendance-fyp`
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add these two secrets:

**Secret 1:**
- Name: `VITE_SUPABASE_URL`
- Value: Your Supabase project URL

**Secret 2:**
- Name: `VITE_SUPABASE_ANON_KEY`
- Value: Your Supabase anon public key

**Where to find these values:**
- Go to [supabase.com](https://supabase.com) → Your project
- Click **Settings** → **API**
- Copy:
  - **Project URL** → use for `VITE_SUPABASE_URL`
  - **anon public** key → use for `VITE_SUPABASE_ANON_KEY`

### Step 4: Trigger Deployment

The workflow file was already added by Azure, but you need to push a change to trigger it with your secrets:

```bash
git add .
git commit -m "Add Azure deployment workflow"
git push origin main
```

Or just push any small change to trigger deployment.

### Step 5: Get Your Live URL

1. Go to GitHub → **Actions** tab
2. Watch the workflow run (takes 2-3 minutes)
3. Once complete, go back to [Azure Portal](https://portal.azure.com)
4. Open your Static Web App resource
5. Click **Overview** - you'll see your live URL:
   ```
   https://attendance-fyp.azurestaticapps.net
   ```

Click it to see your deployed app! 🚀

---

## Troubleshooting

**Workflow fails?**
- Check you added both Supabase secrets to GitHub
- Verify `npm run build` works locally
- Check Actions tab for error logs

**App shows blank page?**
- Open browser DevTools (F12) → Console
- Check for errors related to Supabase connection
- Verify environment variables are set correctly

**Need to update environment variables?**
- Update them in GitHub Secrets
- Push any change to trigger re-deployment
- Or go to Azure Portal → Static Web App → Configuration

---

## Next Steps

- ✅ Your app is live at Azure Static Web Apps
- ✅ Auto-deploys on every push to `main` branch
- Add custom domain (optional): Azure Portal → Static Web App → Custom domains
- Monitor: Azure Portal → Static Web App → Metrics

---

## Cost

**Free tier includes:**
- 100 GB bandwidth per month
- 0.5 GB storage
- Custom domains
- Automatic SSL certificates

You won't be charged unless you exceed these limits (very unlikely for your app).
