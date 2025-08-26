# ⚡ Quick Deploy Guide

## 🚀 Deploy PetCanvas in 3 Steps

### 1. Setup GitHub Repository

```bash
# Initialize git (if not already done)
git init
git add .
git commit -m "initial commit: PetCanvas ready for deployment"

# Create GitHub repository and push
gh repo create petcanvas-app --public --push
# OR manually create repo and:
git remote add origin https://github.com/yourusername/petcanvas-app.git  
git push -u origin main
```

### 2. Configure Vercel & Secrets

```bash
# Install and link Vercel
npm install -g vercel
vercel link

# Get your org and project IDs
cat .vercel/project.json
```

Go to GitHub → Settings → Secrets → Add these secrets:

| Secret | Value | Get It From |
|--------|--------|------------|
| `VERCEL_TOKEN` | `vercel_xxx` | [vercel.com/account/tokens](https://vercel.com/account/tokens) |
| `VERCEL_ORG_ID` | `team_xxx` | `.vercel/project.json` |
| `VERCEL_PROJECT_ID` | `prj_xxx` | `.vercel/project.json` |
| `GA_MEASUREMENT_ID` | `G-XXXXXXXXXX` | Google Analytics |
| `SITE_URL` | `https://petcanvas.vercel.app` | Your domain |
| `A1111_BASE_URL` | `http://localhost:7860` | Local/tunnel URL |
| `COMFYUI_BASE_URL` | `http://localhost:8188` | Local/tunnel URL |

### 3. Deploy

```bash
# Push to trigger automatic deployment
git push origin main
```

That's it! ✨

---

## 🔗 Useful Links After Setup

- **Live App**: Check GitHub Actions for deployment URL
- **GitHub Actions**: `https://github.com/yourusername/petcanvas-app/actions`
- **Vercel Dashboard**: `https://vercel.com/dashboard`
- **Local Dev**: `npm run dev` (http://localhost:5174)

## 🚨 If Something Goes Wrong

1. **Check GitHub Actions logs** for specific errors
2. **Verify all secrets are set** (case-sensitive)
3. **Test build locally**: `npm run build`
4. **Contact support** with error messages

## 🎨 What Gets Deployed

✅ **Famous painting style icons** (Mona Lisa, Van Gogh, Monet)  
✅ **Complete E2E test suite** (32 tests)  
✅ **Image validation system** (pet detection, file limits)  
✅ **Mobile-responsive design**  
✅ **AI model integration** (A1111 + ComfyUI)  
✅ **Performance optimizations**  

**Next**: Upload a pet photo and create your first oil painting! 🐕🎨