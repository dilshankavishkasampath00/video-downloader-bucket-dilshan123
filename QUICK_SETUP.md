# 🚀 AWS Deployment - Quick Visual Guide

## The Process at a Glance

```
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: Local Setup (5 minutes)                             │
├─────────────────────────────────────────────────────────────┤
│ 1. Run: setup-windows.bat                                   │
│ 2. Edit: .env with your values                              │
│ 3. Run: npm start                                           │
│ 4. Test at: http://localhost:3000                           │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 2: AWS Setup (10 minutes)                              │
├─────────────────────────────────────────────────────────────┤
│ 1. Create AWS Account (aws.amazon.com)                      │
│ 2. Create IAM User with S3 permissions                      │
│ 3. Create S3 bucket                                         │
│ 4. Run: aws configure (add your credentials)                │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 3: Deploy to AWS (varies by option)                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ OPTION A: AWS App Runner (Easiest - 10 min)                │
│ ✓ No server management                                      │
│ ✓ Automatic scaling                                        │
│ ✓ Best for beginners                                       │
│                                                             │
│ OPTION B: EC2 (More control - 20 min)                      │
│ ✓ Full server control                                      │
│ ✓ Can customize everything                                 │
│ ✓ More expensive but free tier available                   │
│                                                             │
│ OPTION C: Docker + ECS (Most scalable - 30 min)            │
│ ✓ Production-ready                                         │
│ ✓ Auto-scaling                                             │
│ ✓ Most complex                                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 4: Access Your Live App! 🎉                            │
├─────────────────────────────────────────────────────────────┤
│ Share your AWS URL with anyone on the internet!             │
└─────────────────────────────────────────────────────────────┘
```

---

## Command Cheat Sheet

### Windows PowerShell Commands

```powershell
# ===== LOCAL SETUP =====
.\setup-windows.bat                    # Run setup script

# ===== TESTING =====
npm start                              # Start app locally
npm install                            # Install dependencies

# ===== AWS SETUP =====
aws configure                          # Setup AWS credentials
aws sts get-caller-identity            # Verify AWS access

# ===== S3 BUCKET OPERATIONS =====
aws s3 mb s3://bucket-name --region us-east-1    # Create bucket
aws s3 ls                              # List all buckets
aws s3 ls s3://bucket-name             # List files in bucket
aws s3 rm s3://bucket-name/file        # Delete file from S3

# ===== GIT OPERATIONS (for App Runner) =====
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/USERNAME/video-downloader.git
git push -u origin main

# ===== EC2 DEPLOYMENT (if using EC2) =====
# SSH into instance:
ssh -i .\video-downloader-key.pem ubuntu@PUBLIC_IP

# On EC2:
sudo apt update && sudo apt upgrade -y
sudo apt install -y nodejs npm python3-pip ffmpeg
pip3 install yt-dlp
```

---

## Files Created for You

| File | Purpose |
|------|---------|
| `AWS_DEPLOYMENT.md` | Complete step-by-step AWS deployment guide |
| `BACKEND_ISSUES.md` | Solutions for common backend problems |
| `setup-windows.bat` | Automated setup script for Windows |
| `QUICK_START_AWS.md` | Quick reference (already existed) |

---

## Your Project Structure

```
video-downloader/
├── server.js                 ← Main backend code
├── package.json              ← Dependencies
├── .env                      ← Your AWS config (CREATE THIS)
├── .env.example              ← Template
├── Dockerfile                ← For Docker deployment
├── AWS_DEPLOYMENT.md         ← Deploy to AWS (READ THIS FIRST)
├── BACKEND_ISSUES.md         ← Fix problems
├── QUICK_START_AWS.md        ← Quick reference
├── setup-windows.bat         ← Windows setup script
├── public/                   ← Frontend
│   └── index.html
└── downloads/                ← Temporary downloads folder
```

---

## 5-Minute Checklist

Before you deploy, make sure you have:

- [ ] AWS Account created (aws.amazon.com)
- [ ] IAM user created with S3 permissions
- [ ] S3 bucket created
- [ ] `.env` file with:
  ```
  AWS_REGION=us-east-1
  S3_BUCKET=your-bucket-name
  ```
- [ ] Local test works: `npm start` → http://localhost:3000
- [ ] AWS credentials configured: `aws configure`
- [ ] Can verify AWS: `aws sts get-caller-identity`

---

## Backend Issues Quick Fixes

| Issue | Quick Fix |
|-------|-----------|
| "yt-dlp not found" | `pip install yt-dlp` |
| "S3 bucket doesn't exist" | Check `.env` S3_BUCKET name |
| "AWS credentials not found" | Run `aws configure` |
| "Access Denied to S3" | Add `AmazonS3FullAccess` to IAM user |
| "No space on disk" | Increase cleanup frequency in server.js |
| "Download fails" | Try public YouTube video, update yt-dlp |

For full solutions, see: **BACKEND_ISSUES.md**

---

## Deployment Comparison

### App Runner (Recommended for Beginners)

```
✅ Pros:
  - Push code to GitHub, it auto-deploys
  - No server management needed
  - Free tier: 250 hours/month
  - Automatic scaling
  - Built-in logging

❌ Cons:
  - Less customization
  - Can't SSH into server
  - More expensive if high traffic
```

**Time to deploy**: ~15 minutes
**Cost**: Free tier, then ~$20-30/month

---

### EC2 (Recommended for Control)

```
✅ Pros:
  - Full server control via SSH
  - Can install/customize anything
  - Free tier: t2.micro (750 hours/month)
  - Lower cost for light usage

❌ Cons:
  - Need to manage updates/patches
  - Need to manage security
  - Need to monitor server health
```

**Time to deploy**: ~30 minutes
**Cost**: Free tier, then ~$5-15/month for t2.micro

---

## What Happens When You Download a Video

```
User visits: https://your-app.apprunner.aws...
                    ↓
        User enters video URL
                    ↓
        Frontend sends request to backend
                    ↓
        Backend runs: yt-dlp (downloads video)
                    ↓
        FFmpeg processes video (if needed)
                    ↓
        File uploaded to S3 bucket
                    ↓
        Local file deleted (cleanup)
                    ↓
        User gets download link from S3
                    ↓
        User can download/share the link
```

---

## Next Steps

### Option A: Quick Deploy (App Runner) ✅ EASIEST
1. Push code to GitHub
2. Go to AWS App Runner
3. Select repo, set environment variables
4. Click Deploy
5. Get URL in 5-10 minutes
6. Done! 🎉

### Option B: Detailed Deploy (EC2)
1. Launch EC2 instance
2. SSH into it
3. Install dependencies
4. Clone code and configure
5. Run with PM2
6. Assign IAM role
7. Get public IP → Live! 🎉

### Option C: Docker Deploy (ECS)
1. Build Docker image
2. Push to ECR
3. Create ECS cluster
4. Deploy task definition
5. Attach load balancer
6. Production-ready! 🎉

---

## Common Questions

**Q: How much will it cost?**
A: Free tier covers most small deployments. ~$0-50/month after free tier.

**Q: Can I use a custom domain?**
A: Yes! After deployment, point your domain DNS to the AWS URL/IP.

**Q: What if my video download fails?**
A: Check BACKEND_ISSUES.md → Test with YouTube first → Update yt-dlp

**Q: How do I see what's happening?**
A: Check logs - App Runner has Logs tab, EC2 use `pm2 logs`, Docker use CloudWatch.

**Q: Is my app secure?**
A: It's publicly accessible. See BACKEND_ISSUES.md Security section for hardening tips.

---

## Emergency Contacts

If something breaks:

1. **Check logs first**:
   - App Runner: AWS Console → Logs tab
   - EC2: SSH in, run `pm2 logs`
   - Local: `npm start` (check console output)

2. **Check AWS credentials**:
   ```
   aws sts get-caller-identity
   ```

3. **Check S3 access**:
   ```
   aws s3 ls
   ```

4. **Check yt-dlp**:
   ```
   yt-dlp --version
   yt-dlp --info "https://www.youtube.com/watch?v=jNQXAC9IVRw"
   ```

---

## Pro Tips

1. **Test locally first** - Always test with `npm start` before deploying
2. **Read error messages carefully** - They usually tell you exactly what's wrong
3. **Check AWS billing** - Keep eye on S3 storage costs
4. **Use CloudFront** - For free caching of S3 files (saves costs)
5. **Set S3 lifecycle** - Auto-delete old videos after 7 days
6. **Monitor disk space** - EC2: Check with `df -h`
7. **Use environment variables** - Never hardcode AWS credentials

---

## 📚 Documentation Map

```
START HERE:
  ↓
AWS_DEPLOYMENT.md (Complete guide)
  ↓
  ├─→ Having issues? BACKEND_ISSUES.md
  ├─→ On Windows? Run setup-windows.bat
  └─→ Quick reference? QUICK_START_AWS.md
```

---

**Ready? Pick your deployment option and follow AWS_DEPLOYMENT.md! 🚀**
