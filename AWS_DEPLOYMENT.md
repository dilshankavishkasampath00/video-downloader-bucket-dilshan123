# Complete AWS Deployment Guide - Step by Step

## 📋 Overview
This guide covers deploying your video-downloader to AWS with full backend configuration, error handling, and live internet hosting.

---

## 🔧 PART 1: Fix Backend Issues (Prerequisites)

### Issue 1: Missing yt-dlp Binary
**Problem**: yt-dlp may not be installed or found in PATH on AWS servers

**Solution**:
```bash
# On your local machine, verify yt-dlp is available:
yt-dlp --version

# If not installed:
pip install yt-dlp

# On AWS servers, it's handled by:
# - Dockerfile (includes: pip3 install yt-dlp)
# - Or EC2: SSH and run: sudo apt-get install -y python3-pip && pip3 install yt-dlp
```

### Issue 2: Missing FFmpeg
**Problem**: FFmpeg is required for video processing

**Solution**: 
- ✅ Already in Dockerfile
- For EC2: `sudo apt-get install -y ffmpeg`

### Issue 3: Storage Limits
**Problem**: Downloaded videos consume disk space. AWS servers have limited storage.

**Solution**:
```javascript
// Already handled in server.js (30-minute auto-cleanup)
// But add this for large files:

// 1. Use S3 ONLY (not local storage)
// 2. Set lifecycle policy on S3 bucket to delete after 7 days
// 3. For very large files, consider using AWS S3 pre-signed URLs for direct download
```

### Issue 4: Missing Environment Variables
**Problem**: `.env` file not created or AWS credentials not set

**Solution**: See PART 2 below

---

## 🚀 PART 2: AWS Setup (Prerequisites)

### Step 1: Create AWS Account
1. Go to [aws.amazon.com](https://aws.amazon.com)
2. Click "Create an AWS Account"
3. Complete registration and email verification
4. Add a payment method (required, but free tier available)

### Step 2: Create IAM User (for API access)
1. Go to AWS Console → **IAM** → **Users**
2. Click **Create user** → Name: `video-downloader-user`
3. Check: **Provide user access to the AWS Management Console** (optional, for simplicity just use programmatic access)
4. Click **Next**
5. Under **Permissions**, attach policies:
   - Click **Attach policy directly**
   - Search & select: `AmazonS3FullAccess`
   - Click **Next** → **Create user**
6. Go back to Users → `video-downloader-user` → **Security credentials** tab
7. Click **Create access key** → Select "Command Line Interface (CLI)"
8. **⚠️ SAVE THESE SECURELY**:
   - Access Key ID
   - Secret Access Key

### Step 3: Create S3 Bucket
```powershell
# Option A: Using AWS CLI (recommended)
aws s3 mb s3://video-downloader-bucket-YOURNAME --region us-east-1

# Verify:
aws s3 ls

# Option B: Via AWS Console
# 1. Go to S3 → Create bucket
# 2. Name: video-downloader-bucket-YOURNAME
# 3. Region: us-east-1
# 4. Click Create
```

### Step 4: Configure S3 Auto-Delete (Optional but recommended)
1. Go to S3 → Your bucket → **Management** tab
2. Click **Create lifecycle rule**
3. Name: `delete-old-videos`
4. Filter: Leave blank (apply to all)
5. **Expire current versions**: 7 days
6. Click **Create rule**

---

## 📦 PART 3: Prepare Your Local Project

### Step 1: Create `.env` file
```bash
cd video-downloader

# Copy example
cp .env.example .env

# Edit .env with your values
```

**Edit `.env`**:
```
AWS_REGION=us-east-1
S3_BUCKET=video-downloader-bucket-YOURNAME
```

### Step 2: Set AWS Credentials Locally
```powershell
# Windows
aws configure

# Enter:
# AWS Access Key ID: [Your Access Key ID]
# AWS Secret Access Key: [Your Secret Access Key]
# Default region: us-east-1
# Default output: json
```

### Step 3: Test Locally
```bash
npm install
npm start

# Test: Open http://localhost:3000 and try a download
```

---

## 🌐 PART 4: Deploy to AWS (Choose One Option)

## ✅ OPTION 1: AWS App Runner (EASIEST - Recommended)

### Why App Runner?
- No EC2/container management
- Automatic scaling
- Built-in Docker support
- Free tier available

### Steps:

#### 1. Create GitHub Repository
```bash
git init
git add .
git commit -m "Initial commit"
# Push to GitHub (create repo on github.com first)
git remote add origin https://github.com/YOUR_USERNAME/video-downloader.git
git branch -M main
git push -u origin main
```

#### 2. Deploy via App Runner Console
1. Go to AWS Console → **App Runner**
2. Click **Create service**
3. **Source**: Select **GitHub**
   - Connect your GitHub account
   - Select repository: `video-downloader`
   - Branch: `main`
4. **Configuration**:
   - Runtime: **Node.js 18**
   - Build command: `npm install`
   - Start command: `npm start`
5. **Service settings**:
   - Service name: `video-downloader`
   - Port: `3000`
   - Environment variables:
     ```
     AWS_REGION=us-east-1
     S3_BUCKET=video-downloader-bucket-YOURNAME
     NODE_ENV=production
     PORT=3000
     ```
6. **IAM role**:
   - Select **Create new service role**
   - This role needs S3 access (next step)
7. Click **Create & Deploy** (wait 5-10 minutes)

#### 3. Add S3 Permissions to App Runner Role
1. Go to **IAM** → **Roles**
2. Find & click role created by App Runner (name like `AppRunnerECRAccessRole`)
3. Click **Add permissions** → **Attach policies**
4. Search & select: `AmazonS3FullAccess`
5. Click **Attach policy**

#### 4: Get Your Live URL
- Go back to App Runner service
- Copy the **Service URL** (looks like: `https://xxxxx.region.apprunner.aws`...)
- Share this URL! 🎉

---

## ✅ OPTION 2: AWS EC2 (More Control)

### Steps:

#### 1. Launch EC2 Instance
1. Go to AWS Console → **EC2** → **Launch instances**
2. **Name**: `video-downloader`
3. **AMI**: Select **Ubuntu Server 22.04 LTS** (free tier eligible)
4. **Instance type**: `t2.micro` (free tier)
5. **Key pair**: Create new
   - Name: `video-downloader-key`
   - Type: **RSA**
   - Format: **.pem**
   - Click **Create key pair** (saves to your computer)
6. **Network settings**:
   - Allow SSH (22)
   - Allow HTTP (80)
   - Allow HTTPS (443)
   - Allow TCP 3000 (your app port)
7. **Storage**: 20 GB (default is fine)
8. Click **Launch instance**

#### 2. Connect to Instance
```powershell
# Navigate to where you saved the key
cd Downloads

# Connect (replace INSTANCE_IP)
ssh -i video-downloader-key.pem ubuntu@INSTANCE_IP

# Find INSTANCE_IP in EC2 console under Public IPv4 address
```

#### 3. Install Dependencies on EC2
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Python & yt-dlp
sudo apt install -y python3-pip ffmpeg
pip3 install yt-dlp

# Install Git
sudo apt install -y git

# Verify installations
node --version
yt-dlp --version
ffmpeg -version
```

#### 4. Clone & Setup Project
```bash
git clone https://github.com/YOUR_USERNAME/video-downloader.git
cd video-downloader

npm install
```

#### 5. Create `.env` on EC2
```bash
nano .env
```

Add:
```
AWS_REGION=us-east-1
S3_BUCKET=video-downloader-bucket-YOURNAME
NODE_ENV=production
PORT=3000
```

Save: `Ctrl+X` → `Y` → `Enter`

#### 6: Assign IAM Role to EC2 Instance
1. Go to EC2 → Your instance
2. Click **Instance state** dropdown → **Security** → **Modify IAM role**
3. Create new role or use existing S3 access role
4. Select it and click **Update IAM role**

#### 7: Run Application (Background)
```bash
# Using PM2 (process manager)
sudo npm install -g pm2

pm2 start server.js --name video-downloader
pm2 startup
pm2 save

# Check status
pm2 status
pm2 logs video-downloader
```

#### 8: Get Live URL
- Use your EC2 **Public IPv4 address**
- Access at: `http://YOUR_EC2_IP:3000`

#### 9: (Optional) Setup Domain with Elastic IP
```bash
# 1. Allocate Elastic IP in EC2 console
# 2. Associate with your instance
# 3. Point your domain DNS to this IP
# 4. Access via domain name instead of IP
```

---

## ✅ OPTION 3: Docker + ECR + ECS (Most Scalable)

### Quick Steps:
```bash
# 1. Build Docker image
docker build -t video-downloader .

# 2. Create ECR repository
aws ecr create-repository --repository-name video-downloader --region us-east-1

# 3. Push to ECR
# (Get push commands from AWS Console → ECR → Select repo → View push commands)

# 4. Create ECS cluster & task definition
# Use AWS Console → ECS → Create cluster
# Reference image from ECR

# 5. Deploy task & load balancer
```

---

## 🔍 PART 5: Testing & Troubleshooting

### Test Your Deployment
1. Visit your live URL
2. Enter a video URL (TikTok, Instagram, Facebook)
3. Select quality
4. Click Download
5. Verify file appears in S3 bucket

### Common Issues & Fixes

#### ❌ "yt-dlp: command not found"
```bash
# App Runner/EC2:
pip3 install yt-dlp
# Or in Dockerfile, ensure: pip3 install yt-dlp
```

#### ❌ "AWS credentials not found"
```bash
# Verify:
aws sts get-caller-identity

# If fails, check:
cat ~/.aws/credentials  # Linux/Mac
type %USERPROFILE%\.aws\credentials  # Windows
```

#### ❌ "S3_BUCKET not configured"
```bash
# Check .env exists and has:
echo $S3_BUCKET  # Linux/Mac
echo %S3_BUCKET%  # Windows PowerShell
```

#### ❌ "Video file too large" / "Disk space error"
```javascript
// Solution in server.js is already there (30-min cleanup)
// Additional: Upload to S3 immediately after download, then delete local
```

#### ❌ "503 Service Unavailable" on App Runner
- Wait 5-10 more minutes for deployment to fully start
- Check deployment logs in App Runner console
- Verify environment variables are set

#### ❌ "Access Denied" to S3
1. Check IAM role has `AmazonS3FullAccess`
2. Verify S3 bucket name in `.env` matches AWS bucket
3. Verify AWS_REGION is correct

---

## 📊 Monitoring & Logs

### App Runner
- Console → **Logs** tab → View real-time logs

### EC2
```bash
pm2 logs video-downloader
```

### View S3 Uploads
```powershell
aws s3 ls s3://video-downloader-bucket-YOURNAME/downloads/ --recursive
```

---

## 💰 Cost Estimates (Monthly)

| Service | Cost |
|---------|------|
| App Runner (free tier: 250 hours) | $0-20 |
| EC2 t2.micro (free tier: 750 hours) | $0-15 |
| S3 (5 GB storage) | ~$0.12 |
| Data transfer (1 GB out) | ~$0.09 |
| **Total (free tier)** | **~$0** |
| **Total (after free tier)** | **~$20-50** |

Free tier usually covers for 12 months!

---

## 🔒 Security Best Practices

1. **Never commit `.env` to Git**
   ```bash
   echo ".env" >> .gitignore
   ```

2. **Rotate credentials regularly**
   - Go to IAM → Users → Security credentials
   - Create new access key, delete old one

3. **Use IAM roles (not access keys)**
   - EC2 & App Runner automatically use roles
   - More secure than embedding credentials

4. **Restrict S3 bucket access**
   ```bash
   # Bucket policy: Allow only your app's role
   ```

5. **Enable S3 versioning** (optional)
   ```powershell
   aws s3api put-bucket-versioning --bucket video-downloader-bucket-YOURNAME --versioning-configuration Status=Enabled
   ```

---

## ✅ Checklist - Ready for Production?

- [ ] `.env` file created with correct S3 bucket name
- [ ] AWS IAM user created with S3 access
- [ ] S3 bucket created
- [ ] AWS credentials configured (`aws configure`)
- [ ] Tested locally (`npm start`)
- [ ] Deployed to AWS (App Runner or EC2)
- [ ] Can access live URL
- [ ] Can download a video successfully
- [ ] File appears in S3 bucket
- [ ] `.env` added to `.gitignore`
- [ ] Domain name assigned (optional)

---

## 📞 Need Help?

**Check logs first:**
```bash
# Local
npm start

# App Runner: AWS Console → Logs
# EC2: pm2 logs
```

**Common error solutions:**
- Video URL not public? → Try YouTube video
- yt-dlp too old? → Run: `pip install --upgrade yt-dlp`
- FFmpeg missing? → Install on server
- S3 full? → Delete old files or increase storage

---

## 🎯 Quick Reference - What to Do Next

```
1. Create AWS Account
2. Create IAM user + S3 bucket
3. Configure .env locally
4. Test npm start
5. Deploy via App Runner (easiest) or EC2
6. Share your live URL!
```

---

**Your app will be live on the internet in ~30 minutes! 🎉**
