# PHASE 3 - DEPLOY FROM YOUR LOCAL MACHINE

**Important:** The v0 sandbox cannot push to GitHub. Deploy from your local machine instead.

---

## WHY THIS APPROACH?

- ✅ v0 sandbox uses temporary git bundle (cannot connect to GitHub)
- ✅ Your local machine has real GitHub access
- ✅ All Phase 3 code is already committed and ready
- ✅ Just need one simple push command

---

## STEP-BY-STEP DEPLOYMENT

### Step 1: Prepare Your Local Machine

On your local machine, open Terminal/Command Prompt and navigate to your project:

```bash
cd /path/to/your/project
```

### Step 2: Configure GitHub Remote

Replace `USERNAME` and `REPO` with your GitHub username and repository name:

```bash
# Add your GitHub repository
git remote add origin https://github.com/USERNAME/REPO.git

# Verify it was added
git remote -v
# Output should show:
# origin https://github.com/USERNAME/REPO.git (fetch)
# origin https://github.com/USERNAME/REPO.git (push)
```

### Step 3: Push Phase 3 to Production

```bash
git push origin master:main
```

### Step 4: Monitor Deployment

Go to: `https://vercel.com/dashboard`

1. Select your project
2. Click "Deployments"
3. Watch build progress
4. Wait for status "Ready" (green checkmark)
5. Build should complete in ~2-3 minutes

### Step 5: Verify It Works

Once deployment shows "Ready":

```bash
# Open in browser
https://your-domain.vercel.app/dashboard/sostenibilidad/no-conformidades

# Test create non-conformance
# Verify auto-numbering: NC-2026-XXXX
# Check compliance score
# Review audit trail
```

---

## NEED TO DOWNLOAD CODE FROM V0 FIRST?

If you don't have the code locally yet:

1. In v0, click **three dots (...)** in top right
2. Select **"Download ZIP"**
3. Extract to your computer
4. Open Terminal in that folder
5. Continue with Step 2 above

---

## TROUBLESHOOTING

### "fatal: remote origin already exists"

If you get this error:

```bash
git remote remove origin
git remote add origin https://github.com/USERNAME/REPO.git
```

### "fatal: Could not read from remote repository"

This means GitHub credentials aren't configured. Fix with:

```bash
# Set git user
git config --global user.email "your-email@example.com"
git config --global user.name "Your Name"

# Then try push again
git push origin master:main
```

### "Permission denied (publickey)"

SSH key not configured. Use HTTPS instead:

```bash
git remote remove origin
git remote add origin https://github.com/USERNAME/REPO.git
git push origin master:main
```

### Build fails on Vercel

1. Go to Vercel Dashboard → Deployments → [failed build] → Logs
2. Check error message
3. See "TROUBLESHOOTING" section in FINAL_DEPLOYMENT_GUIDE.md

---

## WHAT GETS DEPLOYED

**Phase 3 - Non-Conformance Management System**

- 2,200+ lines of production code
- 5 database tables
- 13 RLS policies
- 7 performance indexes
- Auto-numbered NCs (NC-YYYY-XXXX)
- Corrective action planning
- Compliance score calculation
- Full audit logging
- RBAC protection
- Complete dashboard

---

## VERIFICATION AFTER DEPLOYMENT

See **DEPLOYMENT_CHECKLIST.md** for complete post-deployment verification steps.

Quick checks:

```bash
# 1. Dashboard accessible
curl https://your-domain.vercel.app/dashboard/sostenibilidad/no-conformidades

# 2. Create test NC
curl -X POST https://your-domain.vercel.app/api/sostenibilidad/nonconformances \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","severity":"medium"}'

# 3. Verify auto-numbering in response (NC-2026-XXXX)
```

---

## DONE!

Once deployment shows "Ready" in Vercel, Phase 3 is live in production.

**Total deployment time:** ~5 minutes (1 min setup + 2-3 min Vercel build + 1 min verification)

---

## NEXT STEPS

1. Monitor first 24 hours for errors
2. Gather user feedback
3. Plan Phase 4 features:
   - SERNAGEOMIN auto-reports
   - ISO 45001/14001 compliance
   - Internal audit system

---

**Status:** ✅ Code ready | ✅ Just needs one push | ✅ Vercel handles the rest
