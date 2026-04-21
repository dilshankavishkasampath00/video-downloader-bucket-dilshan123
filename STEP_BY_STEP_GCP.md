# Deploy to Google Cloud Run - Step by Step

## STEP 1: Create a Google Account & Project (5 minutes)

### 1.1 Go to Google Cloud Console
- Open: https://console.cloud.google.com
- Sign in with your Google account (create one if needed - it's FREE)

### 1.2 Create a New Project
- Click **Select a Project** (top left)
- Click **NEW PROJECT**
- Name it: `video-downloader`
- Click **CREATE**
- Wait 30 seconds for project to be ready
- Click the project name to open it

---

## STEP 2: Enable Required Services (2 minutes)

In the Google Cloud Console:

### 2.1 Enable Cloud Run API
- Click the **search bar** at top
- Type: `Cloud Run API`
- Click the result
- Click **ENABLE**
- Wait for it to say "API is enabled"

### 2.2 Enable Build API
- Go back, search: `Cloud Build API`
- Click result → **ENABLE**

### 2.3 Enable Container Registry
- Go back, search: `Container Registry API`
- Click result → **ENABLE**

---

## STEP 3: Install Google Cloud CLI (5 minutes)

### 3.1 Download Installer
- Go to: https://cloud.google.com/sdk/docs/install
- Download for **Windows**
- Run the installer (click Next, Next, Finish)

### 3.2 Open PowerShell and Authenticate
```powershell
# Open PowerShell (any folder)
gcloud init

# A browser window will open
# Sign in with your Google account
# Choose your project: "video-downloader"
# Select region: us-central1
# Press Enter to confirm
```

### 3.3 Verify Installation
```powershell
gcloud --version
# Should show: Google Cloud SDK x.x.x
```

---

## STEP 4: Deploy to Cloud Run (2 minutes)

### 4.1 Open Terminal in Your App Folder
```powershell
# Navigate to your video-downloader folder
cd g:\downloders\1\video-downloader

# Verify files are here
dir
# You should see: server.js, package.json, Dockerfile, public/, downloads/
```

### 4.2 Deploy with One Command
```powershell
gcloud run deploy video-downloader `
  --source . `
  --platform managed `
  --region us-central1 `
  --allow-unauthenticated
```

**IMPORTANT:**
- When it asks "Allow unauthenticated invocations?", press **Y** and Enter
- The deployment will take 2-3 minutes
- You'll see a long output while building...

### 4.3 Wait for Completion
When complete, you'll see:
```
Service [video-downloader] revision [video-downloader-00001-abc] has been deployed and is serving 100% of traffic.
Service URL: https://video-downloader-abc123xyz.a.run.app
```

**Copy that URL!** That's your live website.

---

## STEP 5: Test Your Website (1 minute)

### 5.1 Open Your Website
```
Paste in browser: https://video-downloader-abc123xyz.a.run.app
(Replace abc123xyz with your actual URL from Step 4.3)
```

You should see the video downloader interface!

### 5.2 Test a Download
- Paste a TikTok, Instagram, or Facebook video URL
- Click "Fetch Info"
- Select quality
- Click "Download"
- It should work!

---

## STEP 6: Share Your Website (Done!)

Your website is now LIVE! 🎉

**Share this link with anyone:**
```
https://video-downloader-abc123xyz.a.run.app
```

---

## TROUBLESHOOTING

### Problem: gcloud command not found
**Solution:**
```powershell
# Restart PowerShell completely
# Close all PowerShell windows
# Open a fresh PowerShell window
# Try again
```

### Problem: Deployment fails with "permission denied"
**Solution:**
```powershell
# Re-authenticate
gcloud auth login
# Sign in when browser opens
```

### Problem: Website shows error 500
**Solution:**
```powershell
# Check logs
gcloud run logs read video-downloader --limit 50
# Look for error messages

# Increase memory (if too slow)
gcloud run deploy video-downloader `
  --source . `
  --memory 1Gi `
  --region us-central1 `
  --allow-unauthenticated
```

### Problem: Website is very slow
**Solution:** Increase memory:
```powershell
gcloud run deploy video-downloader `
  --source . `
  --memory 2Gi `
  --cpu 2 `
  --region us-central1 `
  --allow-unauthenticated
```

### Problem: Want to delete the service
```powershell
gcloud run services delete video-downloader --region us-central1
# Type "y" and Enter to confirm
```

---

## UNDERSTANDING YOUR COSTS

### What You'll Pay:
- **First 2M requests per month**: FREE ✅
- **After 2M requests**: $0.40 per 1M additional requests

### Your Usage Likely:
- 10 videos/day = ~300/month
- **You will stay FREE forever** unless extremely popular

### How to Reduce Costs Further:
If worried, set memory limits:
```powershell
gcloud run deploy video-downloader `
  --source . `
  --memory 256Mi `
  --region us-central1 `
  --allow-unauthenticated
```

---

## MONITORING & ADVANCED

### View Live Logs (real-time)
```powershell
gcloud run logs read video-downloader --follow
```

### Update Code (after making changes)
```powershell
cd g:\downloders\1\video-downloader
gcloud run deploy video-downloader `
  --source . `
  --region us-central1 `
  --allow-unauthenticated
```

### Get Service Info
```powershell
gcloud run services describe video-downloader --region us-central1
```

---

## COMMON QUESTIONS

**Q: Is this secure?**
A: Yes! Google handles security, SSL, and updates automatically.

**Q: What if I reach quota?**
A: You'll get an email. You can increase quota free up to generous limits, or just shut down.

**Q: Can I use a custom domain?**
A: Yes! See Google Cloud docs (more advanced setup).

**Q: Do I need Docker installed?**
A: No! Google Cloud builds it for you automatically.

**Q: Can I make it private?**
A: Yes, remove `--allow-unauthenticated` flag.

---

## NEXT STEP

👉 **Follow STEP 1-6 above and you're done!**

Any issues? Run this for help:
```powershell
gcloud run services describe video-downloader --region us-central1
```

Good luck! 🚀
