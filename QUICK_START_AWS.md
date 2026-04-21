# AWS Deployment Quick Start

## For Local Testing with S3:

1. **Install dependencies**:
```bash
npm install
```

2. **Configure AWS credentials**:
```bash
aws configure
# Enter your AWS Access Key ID and Secret Access Key
```

3. **Create `.env` from example**:
```bash
cp .env.example .env
```

4. **Edit `.env` with your S3 bucket**:
```
S3_BUCKET=your-bucket-name
AWS_REGION=us-east-1
```

5. **Start the app**:
```bash
npm start
```

Videos will now be downloaded AND uploaded to your S3 bucket automatically!

---

## Quick AWS Setup (5 minutes)

```powershell
# 1. Create S3 bucket
aws s3 mb s3://video-downloads-$env:USERNAME --region us-east-1

# 2. Test locally with .env configured

# 3. Deploy to AWS (see AWS_DEPLOYMENT.md for detailed steps)
```

---

## What's New

✅ **Docker support** - Deploy anywhere (AWS App Runner, EC2, GCP, etc)
✅ **S3 integration** - Files persist in cloud storage 
✅ **Auto-upload** - Videos upload to S3 after download
✅ **Configurable** - Works with or without S3

See `AWS_DEPLOYMENT.md` for complete deployment guide.
