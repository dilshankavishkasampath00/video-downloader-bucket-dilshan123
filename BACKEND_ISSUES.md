# Backend Issues & Solutions

## Common Problems & How to Fix Them

### 1. ❌ "Cannot find module 'yt-dlp'"

**Error message**: `Error: spawn ENOENT` or `yt-dlp not found`

**Root cause**: yt-dlp binary is not installed

**Solutions**:

**For Local Development**:
```bash
# Windows (PowerShell)
pip install yt-dlp

# Verify
yt-dlp --version

# If pip not found, install Python first
# Download from python.org and check "Add Python to PATH"
```

**For Docker/App Runner** (Already fixed in Dockerfile):
```dockerfile
RUN apk add --no-cache python3 py3-pip ffmpeg \
    && pip3 install yt-dlp
```

**For EC2**:
```bash
sudo apt update
sudo apt install -y python3-pip ffmpeg
pip3 install yt-dlp
```

---

### 2. ❌ "No space left on device"

**Error message**: `Error: ENOSPC: no space available`

**Root cause**: Downloaded videos fill up server disk

**Solution**: Modify server.js to cleanup more aggressively:

```javascript
// Change cleanup interval from 10 minutes to 2 minutes:
// Old:
setInterval(() => { ... }, 10 * 60 * 1000);

// New:
setInterval(() => { ... }, 2 * 60 * 1000);  // every 2 minutes

// Or change cleanup time from 30 minutes to 5 minutes:
// Old:
if (now - stat.mtimeMs > 30 * 60 * 1000) {

// New:
if (now - stat.mtimeMs > 5 * 60 * 1000) {  // 5 minutes
```

**Better solution**: Don't store locally at all - delete after S3 upload:
```javascript
// In server.js, after S3 upload succeeds:
if (s3Url) {
  fs.unlinkSync(filePath);  // Delete local file immediately
  console.log(`[${jobId}] Deleted local file after S3 upload`);
}
```

---

### 3. ❌ "AWS credentials not found" / "Cannot load credentials"

**Error message**: `CredentialsError: Missing credentials in config`

**Root cause**: AWS credentials not configured or `.env` not read

**Solutions**:

**Windows (PowerShell)**:
```powershell
# Configure credentials
aws configure

# Enter your AWS Access Key ID and Secret

# Verify
aws sts get-caller-identity
# Should show your AWS account info
```

**Linux/Mac**:
```bash
aws configure

# Or manually create credentials file:
mkdir -p ~/.aws
nano ~/.aws/credentials

# Add:
[default]
aws_access_key_id = YOUR_ACCESS_KEY
aws_secret_access_key = YOUR_SECRET_KEY
```

**In Node.js code** (server.js already handles this):
```javascript
// The code uses environment variables:
const s3 = new AWS.S3({
  region: process.env.AWS_REGION || 'us-east-1'
});

// AWS SDK auto-loads credentials from:
// 1. Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
// 2. ~/.aws/credentials file
// 3. IAM role (if running on EC2/App Runner)
```

**For App Runner/EC2** - Use IAM roles (no credentials needed):
- Attach IAM role to instance with S3 permissions
- AWS SDK auto-uses it

---

### 4. ❌ "S3 bucket does not exist" / "NoSuchBucket"

**Error message**: `NoSuchBucket` or `The specified bucket does not exist`

**Root cause**: S3_BUCKET environment variable is wrong or bucket not created

**Solutions**:

```bash
# 1. Verify bucket exists
aws s3 ls

# Should list your bucket: "s3://video-downloader-bucket-yourname"

# 2. Check .env file has correct name
cat .env

# Should show: S3_BUCKET=video-downloader-bucket-yourname

# 3. If bucket doesn't exist, create it
aws s3 mb s3://video-downloader-bucket-yourname --region us-east-1

# 4. Verify again
aws s3 ls s3://video-downloader-bucket-yourname
```

---

### 5. ❌ "Access Denied" / "AccessDenied" on S3

**Error message**: `AccessDenied` or `User does not have s3:PutObject permission`

**Root cause**: IAM user/role lacks S3 permissions

**Solutions**:

**Check IAM permissions**:
```bash
# See what permissions you have
aws iam list-user-policies --user-name video-downloader-user
aws iam list-attached-user-policies --user-name video-downloader-user
```

**Add S3 permissions**:
1. Go to AWS IAM Console
2. Click Users → Select your user
3. Click "Add permissions" → "Attach policies directly"
4. Search for: `AmazonS3FullAccess`
5. Select it and save

**For EC2/App Runner**:
1. Go to IAM → Roles
2. Find the role attached to your instance
3. Add inline policy or attach `AmazonS3FullAccess`

---

### 6. ❌ "Video download fails" / "ECONNREFUSED"

**Error message**: `Download failed` or `ECONNREFUSED`

**Root cause**: Multiple causes:
- URL is private/protected
- Rate limiting
- Network timeout
- yt-dlp outdated

**Solutions**:

```bash
# 1. Update yt-dlp
pip install --upgrade yt-dlp

# 2. Test URL manually
yt-dlp --info "https://www.instagram.com/p/YOUR_VIDEO_ID/"

# 3. Check if URL is public (not private/removed)

# 4. For rate limiting, add wait:
# Modify server.js:
const args = [
  ...
  '--wait-min', '3',  // Wait 3 seconds between downloads
  ...
];

# 5. For timeouts, increase timeout:
const args = [
  ...
  '--socket-timeout', '30',  // 30 second timeout
  ...
];
```

---

### 7. ❌ "App crashes after download" / Memory leak

**Error message**: `FATAL ERROR: CALL_AND_RETRY_LAST` or process keeps crashing

**Root cause**: Large file processing consumes too much memory

**Solutions**:

```bash
# Increase Node.js memory limit:
# Option 1 - Environment variable
export NODE_OPTIONS="--max-old-space-size=2048"
npm start

# Option 2 - In package.json scripts:
"scripts": {
  "start": "node --max-old-space-size=2048 server.js"
}

# Option 3 - On EC2, use PM2 with memory limits:
pm2 start server.js --name video-downloader --max-memory-restart 1G
```

---

### 8. ❌ "Cannot read property of undefined"

**Error message**: `Cannot read property 's3Url' of undefined`

**Root cause**: Job object not properly initialized or async issue

**Solution** (Already in code, but verify):

```javascript
// Make sure job initialization is correct:
jobs[jobId] = { 
  status: 'running', 
  progress: 0, 
  filename: null, 
  error: null,
  downloadUrl: null,  // Add this
  s3Url: null         // Add this
};
```

---

### 9. ❌ "Port 3000 already in use"

**Error message**: `Error: listen EADDRINUSE: address already in use :::3000`

**Solutions**:

```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :3000
kill -9 <PID>

# Or change port in server.js:
const PORT = process.env.PORT || 3001;  // Change to 3001
```

---

### 10. ❌ "CORS Error" / Cross-origin request blocked

**Error message**: `Access to XMLHttpRequest blocked by CORS policy`

**Root cause**: Frontend and backend on different domains

**Solution** (Add to server.js):

```javascript
const cors = require('cors');

// After app = express():
app.use(cors({
  origin: '*',  // Allow all (not secure for production)
  // Or:
  origin: ['https://yourdomain.com', 'http://localhost:3000'],
  credentials: true
}));
```

Install CORS:
```bash
npm install cors
```

---

## 🧪 Testing Backend Issues

### Test 1: Verify yt-dlp works
```bash
yt-dlp --dump-json "https://www.youtube.com/watch?v=jNQXAC9IVRw" | head -20
```

### Test 2: Verify FFmpeg works
```bash
ffmpeg -version
```

### Test 3: Verify S3 access
```bash
aws s3 ls s3://your-bucket-name/
aws s3 cp test.txt s3://your-bucket-name/test.txt
```

### Test 4: Test backend locally
```bash
npm start

# In another terminal:
curl -X POST http://localhost:3000/api/info \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.youtube.com/watch?v=jNQXAC9IVRw"}'
```

### Test 5: Check all environment variables
```bash
# Windows
echo $env:S3_BUCKET
echo $env:AWS_REGION

# Linux/Mac
echo $S3_BUCKET
echo $AWS_REGION

# Or check .env file
cat .env
```

---

## 📋 Debugging Checklist

Before posting issues:

- [ ] Run `yt-dlp --version` - returns version number
- [ ] Run `ffmpeg -version` - returns version number
- [ ] Run `npm install` - no errors
- [ ] Create `.env` with S3_BUCKET and AWS_REGION
- [ ] Run `aws configure` and verify credentials
- [ ] Run `aws s3 ls` - lists your buckets
- [ ] Run `npm start` - app starts without errors
- [ ] Open `http://localhost:3000` - page loads
- [ ] Try downloading a public YouTube video
- [ ] Check file in S3 bucket

---

## 🚑 Emergency Debugging

If everything is failing:

```bash
# 1. Start fresh
rm -rf node_modules package-lock.json
npm install
npm start

# 2. Check Node version
node --version  # Should be v16 or higher

# 3. Check all dependencies
npm list

# 4. Review all errors
npm start 2>&1 | tee debug.log

# 5. Test each component separately
yt-dlp --version
ffmpeg -version
aws sts get-caller-identity
node -e "console.log(require('aws-sdk').VERSION)"

# 6. Check if port is available
netstat -an | grep 3000
```

---

## 💡 Pro Tips

1. **Always test locally first** before deploying to AWS
2. **Check CloudWatch logs** on AWS (App Runner → Logs tab)
3. **Use PM2 for process management** on EC2
4. **Set S3 lifecycle policies** to delete old files automatically
5. **Monitor S3 costs** - videos can eat up storage quickly
6. **Use CloudFront** to cache S3 files (reduces S3 costs)
7. **Add request validation** to prevent abuse

---

## 📞 Still Stuck?

1. Check the error message carefully
2. Look for the exact error in this guide
3. Run the suggested test commands
4. Check AWS CloudWatch logs
5. Check server.js console logs
6. Verify credentials: `aws sts get-caller-identity`
7. Verify S3 bucket: `aws s3 ls`
