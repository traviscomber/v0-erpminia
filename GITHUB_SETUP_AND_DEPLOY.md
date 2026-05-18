# GitHub Setup & Phase 3 Deployment Guide

**Repository Details:**
- Name: `lapatagua`
- Visibility: Public
- GitHub Username: `traviscomber`

---

## STEP 1: Create GitHub Repository

1. Go to: **https://github.com/new**

2. Fill in the form:
   - **Repository name:** `lapatagua`
   - **Description:** MVP Phase 3 - Non-Conformance Management System
   - **Visibility:** Select **Public**
   - **Add .gitignore:** Node
   - **Add license:** MIT (optional)
   - **Do NOT** initialize with README (we have our own)

3. Click **"Create repository"**

---

## STEP 2: Get Your Repository URL

After creating the repo, GitHub shows you the URL. It will be:

```
https://github.com/traviscomber/lapatagua.git
```

Copy this URL (you'll need it in Step 3).

---

## STEP 3: Deploy Phase 3 on Your Local Machine

Open Terminal/Command Prompt on your computer and follow these steps:

### 3a. Navigate to Project

```bash
# Go to where you have the Phase 3 code
cd /path/to/your/project

# Or if you downloaded from v0:
cd /path/to/lapatagua
```

### 3b. Configure Git (First Time Only)

```bash
# Set your Git identity
git config --global user.email "your-email@example.com"
git config --global user.name "Travis Comber"

# Verify
git config --global user.name
# Should show: Travis Comber
```

### 3c. Add GitHub Remote

```bash
# Add your GitHub repository
git remote add origin https://github.com/traviscomber/lapatagua.git

# Verify it was added
git remote -v
# Should show:
# origin https://github.com/traviscomber/lapatagua.git (fetch)
# origin https://github.com/traviscomber/lapatagua.git (push)
```

### 3d. Push Phase 3 to GitHub

```bash
# Push the committed Phase 3 code
git push origin master:main
```

**Expected output:**
```
Counting objects: 150, done.
Delta compression using up to 8 threads.
Compressing objects: 100% (120/120), done.
Writing objects: 100% (150/150), 2.50 MiB | 1.25 MiB/s, done.
Total 150 (delta 45), reused 0 (delta 0)
To https://github.com/traviscomber/lapatagua.git
 * [new branch]      master -> main
```

---

## STEP 4: Verify Push Succeeded

### Check GitHub

1. Go to: **https://github.com/traviscomber/lapatagua**
2. You should see your Phase 3 code uploaded
3. Check the commit history (should show "Phase 3: Non-conformance management...")

### Check Git Locally

```bash
# Verify remote push
git log --oneline origin/main -1
# Should show your Phase 3 commit
```

---

## STEP 5: Connect to Vercel (If Not Already Connected)

1. Go to: **https://vercel.com/dashboard**
2. Click **"Import Project"**
3. Select **"Import Git Repository"**
4. Paste your repository URL: `https://github.com/traviscomber/lapatagua.git`
5. Click **"Continue"**
6. Configure environment variables (Vercel will ask)
7. Click **"Deploy"**

---

## STEP 6: Monitor Deployment

In Vercel Dashboard:

1. Watch **Deployments** tab
2. Status should show:
   - Building... (2-3 minutes)
   - Then: **Ready** ✓ (green)

3. Click the deployment to see:
   - Build logs
   - Deployment URL
   - Preview link

---

## STEP 7: Verify Phase 3 is Live

Once status shows "Ready":

```bash
# Test dashboard URL
https://lapatagua.vercel.app/dashboard/sostenibilidad/no-conformidades

# Or your custom domain if configured in Vercel
https://your-custom-domain.com/dashboard/sostenibilidad/no-conformidades
```

---

## STEP 8: Post-Deployment Verification

Follow **DEPLOYMENT_CHECKLIST.md** for:
- ✓ Dashboard accessibility
- ✓ NC creation (auto-numbering)
- ✓ CA creation
- ✓ Compliance score
- ✓ Audit trail
- ✓ No errors in logs

---

## TROUBLESHOOTING

### Push Failed - "fatal: Could not read from remote repository"

**Solution:**
```bash
# Verify GitHub credentials
git config --global user.name
git config --global user.email

# Or try HTTPS authentication:
git credential-osxkeychain erase host=github.com
# (Then GitHub will prompt for credentials when you push again)
```

### Build Fails on Vercel

1. Go to Vercel Dashboard → Deployments → [failed] → Logs
2. Look for error messages
3. Common fixes:
   - Missing env vars: Add in Vercel Settings → Environment Variables
   - Database not connected: Check Supabase integration
   - TypeScript errors: Check build log details

### Repository Already Exists

If you get "Repository already exists":
```bash
# Increase the URL with a suffix or delete the repo and create new one
# Then try pushing again
```

---

## QUICK REFERENCE

| Step | Command | Purpose |
|------|---------|---------|
| 1 | `git config --global user.name "Travis Comber"` | Set Git identity |
| 2 | `git remote add origin https://github.com/traviscomber/lapatagua.git` | Add GitHub remote |
| 3 | `git push origin master:main` | Deploy to GitHub |
| 4 | Monitor at vercel.com | Watch Vercel build |
| 5 | Open dashboard URL | Test Phase 3 live |

---

## WHAT HAPPENS NEXT

**Automatic Process:**

1. GitHub receives your push
2. Webhook triggers Vercel build
3. Vercel compiles Next.js (~2-3 min)
4. Deployment goes live
5. Dashboard accessible at your URL

**Your URL:**
```
https://lapatagua.vercel.app
```

Or if you connect a custom domain in Vercel settings.

---

## PHASE 3 DEPLOYED! ✅

Once dashboard is accessible, Phase 3 is live in production.

**Total time:** ~10 minutes (5 min local setup + 2-3 min Vercel build + 2-3 min testing)

---

## NEXT STEPS

1. Monitor first 24 hours for errors
2. Review audit logs for mutations
3. Test all features (NC creation, CA creation, compliance score)
4. Plan Phase 4:
   - SERNAGEOMIN auto-reports
   - ISO 45001/14001 compliance
   - Internal audit system
   - Training compliance

---

**MVP Phase 3: Ready to Deploy** ✅

Execute the commands in Step 3 on your local machine to go live.
