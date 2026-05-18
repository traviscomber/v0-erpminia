#!/bin/bash

# Phase 3 Deployment Script
# Run this on your LOCAL machine (not in v0 sandbox)

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║         FASE 3 - PUSHING TO PRODUCTION                        ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Step 1: Verify git status
echo "Step 1: Checking git status..."
git status --short
echo ""

# Step 2: Show commit log
echo "Step 2: Commit ready to push:"
git log --oneline -1
echo ""

# Step 3: Configure remote if needed
if ! git remote get-url origin > /dev/null 2>&1; then
    echo "Step 3: Configuring GitHub remote..."
    echo "Enter your GitHub repository URL (e.g., https://github.com/USERNAME/REPO.git):"
    read REPO_URL
    git remote add origin "$REPO_URL"
    echo "Remote configured: $REPO_URL"
else
    echo "Step 3: Remote already configured:"
    git remote -v
fi
echo ""

# Step 4: Push to main
echo "Step 4: Pushing Phase 3 to production..."
echo "Command: git push origin master:main"
echo ""
git push origin master:main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ PUSH SUCCESSFUL!"
    echo ""
    echo "Next steps:"
    echo "1. Monitor Vercel deployment: https://vercel.com/dashboard"
    echo "2. Wait for build to complete (~2-3 minutes)"
    echo "3. Verify dashboard: https://your-domain.vercel.app/dashboard/sostenibilidad/no-conformidades"
    echo ""
    echo "See DEPLOYMENT_CHECKLIST.md for post-deployment verification"
else
    echo ""
    echo "❌ PUSH FAILED"
    echo ""
    echo "Troubleshooting:"
    echo "1. Check GitHub credentials (git config --global user.email)"
    echo "2. Verify SSH key is added (ssh -T git@github.com)"
    echo "3. Check repository URL (git remote -v)"
    echo "4. Ensure you have push access to repository"
    exit 1
fi
