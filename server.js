const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const ffmpegPath = require('ffmpeg-static');
const AWS = require('aws-sdk');

const app = express();
const PORT = process.env.PORT || 3000;

// Log startup info
console.log('='.repeat(60));
console.log('🎬 Video Downloader Starting');
console.log('='.repeat(60));
console.log(`Port: ${PORT}`);
console.log(`FFmpeg path: ${ffmpegPath}`);
console.log(`AWS Region: ${process.env.AWS_REGION || 'us-east-1'}`);
console.log(`S3 Bucket: ${process.env.S3_BUCKET || 'Not configured'}`);
console.log('='.repeat(60));

// CORS Middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// AWS S3 Configuration (uses environment variables)
const S3_BUCKET = process.env.S3_BUCKET || null;
const s3 = new AWS.S3({
  region: process.env.AWS_REGION || 'us-east-1'
});

// Downloads directory
const DOWNLOADS_DIR = path.join(__dirname, 'downloads');
if (!fs.existsSync(DOWNLOADS_DIR)) fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });

// In-memory job store
const jobs = {};

// ───────────────────────────────────────────────
// S3 Upload Helper Function
// ───────────────────────────────────────────────
async function uploadToS3(filePath, fileName) {
  if (!S3_BUCKET) {
    console.log('[S3] Bucket not configured, skipping upload');
    return null;
  }

  try {
    const fileContent = fs.readFileSync(filePath);
    const params = {
      Bucket: S3_BUCKET,
      Key: `downloads/${Date.now()}-${fileName}`,
      Body: fileContent,
      ContentType: 'video/mp4'
    };

    const data = await s3.upload(params).promise();
    console.log(`[S3] File uploaded: ${data.Location}`);
    return data.Location;
  } catch (error) {
    console.error('[S3] Upload failed:', error.message);
    return null;
  }
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/downloads', express.static(DOWNLOADS_DIR));

// ───────────────────────────────────────────────
// Health Check Endpoint
// ───────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    s3_configured: S3_BUCKET ? true : false,
    s3_bucket: S3_BUCKET || 'not configured',
    aws_region: process.env.AWS_REGION || 'us-east-1'
  });
});

// ───────────────────────────────────────────────
// Root endpoint
// ───────────────────────────────────────────────
app.get('/', (req, res) => {
  res.send('Video Downloader API - Use /health to check status');
});

// ───────────────────────────────────────────────
// POST /api/info  – fetch video metadata + formats
// ───────────────────────────────────────────────
app.post('/api/info', (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  console.log(`[API/info] Fetching info for URL: ${url}`);

  const args = [
    '--dump-json',
    '--no-playlist',
    '--ffmpeg-location', ffmpegPath,
    '--no-warnings',
    url
  ];

  let output = '';
  let errOutput = '';
  const proc = spawn('yt-dlp', args);

  proc.stdout.on('data', d => { output += d.toString(); });
  proc.stderr.on('data', d => { errOutput += d.toString(); });

  proc.on('error', (err) => {
    console.error('[API/info] Process error:', err);
    return res.status(500).json({ error: `Process error: ${err.message}` });
  });

  proc.on('close', code => {
    console.log(`[API/info] Process exited with code: ${code}`);
    
    if (code !== 0) {
      console.error('[API/info] yt-dlp error:', errOutput);
      return res.status(500).json({ 
        error: 'Could not fetch video info. Make sure the URL is public and correct.',
        details: errOutput.substring(0, 200)
      });
    }
    
    if (!output) {
      return res.status(500).json({ error: 'No output from yt-dlp' });
    }

    try {
      const info = JSON.parse(output);

      // Build clean format list
      const formats = [];

      // Best combined formats (video+audio already merged)
      const combined = (info.formats || [])
        .filter(f => f.vcodec !== 'none' && f.acodec !== 'none' && f.ext === 'mp4')
        .sort((a, b) => (b.height || 0) - (a.height || 0));

      const seen = new Set();
      combined.forEach(f => {
        const label = f.height ? `${f.height}p` : f.format_note || f.format_id;
        if (!seen.has(label)) {
          seen.add(label);
          formats.push({ id: f.format_id, label, ext: f.ext || 'mp4', note: f.format_note || '' });
        }
      });

      // Add best-quality option (yt-dlp picks best + merges automatically)
      formats.unshift({ id: 'bestvideo+bestaudio/best', label: 'Best Quality (Auto)', ext: 'mp4', note: 'Highest available' });

      res.json({
        title: info.title || 'Video',
        thumbnail: info.thumbnail || null,
        duration: info.duration || 0,
        uploader: info.uploader || info.channel || '',
        platform: info.extractor_key || '',
        formats: formats.slice(0, 8)
      });
    } catch (e) {
      console.error('[API/info] JSON parse error:', e.message);
      return res.status(500).json({ error: 'Failed to parse video info.' });
    }
  });
});

// ───────────────────────────────────────────────
// POST /api/download  – start a download job
// ───────────────────────────────────────────────
app.post('/api/download', (req, res) => {
  const { url, formatId } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  const jobId = uuidv4();
  const outputTemplate = path.join(DOWNLOADS_DIR, `${jobId}.%(ext)s`);

  jobs[jobId] = { status: 'running', progress: 0, filename: null, error: null };

  const format = formatId && formatId !== 'bestvideo+bestaudio/best'
    ? formatId
    : 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best';

  const args = [
    '-f', format,
    '--ffmpeg-location', ffmpegPath,
    '--merge-output-format', 'mp4',
    '--no-playlist',
    '--no-warnings',
    '--newline',
    '-o', outputTemplate,
    url
  ];

  console.log(`[Job ${jobId}] Starting: yt-dlp ${args.join(' ')}`);
  const proc = spawn('yt-dlp', args);

  proc.stdout.on('data', d => {
    const line = d.toString();
    console.log(`[${jobId}]`, line.trim());

    // Parse progress: [download]  45.2% of ...
    const match = line.match(/\[download\]\s+([\d.]+)%/);
    if (match) {
      jobs[jobId].progress = parseFloat(match[1]);
    }
    // Parse destination filename
    const destMatch = line.match(/\[(?:Merger|download)\] Destination: (.+)/);
    if (destMatch) {
      jobs[jobId].filename = path.basename(destMatch[1].trim());
    }
  });

  proc.stderr.on('data', d => {
    console.error(`[${jobId}] ERR:`, d.toString().trim());
  });

  proc.on('close', code => {
    if (code === 0) {
      // Find the output file
      const files = fs.readdirSync(DOWNLOADS_DIR).filter(f => f.startsWith(jobId));
      if (files.length > 0) {
        const fileName = files[0];
        const filePath = path.join(DOWNLOADS_DIR, fileName);
        jobs[jobId].filename = fileName;
        jobs[jobId].status = 'done';
        jobs[jobId].progress = 100;
        jobs[jobId].downloadUrl = `/downloads/${fileName}`;
        
        console.log(`[${jobId}] Done: ${fileName}`);

        // Upload to S3 if configured
        if (S3_BUCKET) {
          uploadToS3(filePath, fileName)
            .then(s3Url => {
              if (s3Url) {
                jobs[jobId].s3Url = s3Url;
                jobs[jobId].downloadUrl = s3Url; // Prefer S3 URL for persistent access
                console.log(`[${jobId}] S3 URL: ${s3Url}`);
              }
            })
            .catch(err => {
              console.error(`[${jobId}] S3 upload error:`, err);
              // Fallback to local download still available
            });
        }
      } else {
        jobs[jobId].status = 'error';
        jobs[jobId].error = 'File not found after download.';
      }
    } else {
      jobs[jobId].status = 'error';
      jobs[jobId].error = 'Download failed. The video may be private or unavailable.';
    }
  });

  res.json({ jobId });
});

// ───────────────────────────────────────────────
// GET /api/progress/:jobId  – poll job status
// ───────────────────────────────────────────────
app.get('/api/progress/:jobId', (req, res) => {
  const job = jobs[req.params.jobId];
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json(job);
});

// ───────────────────────────────────────────────
// Cleanup old files older than 30 minutes
// ───────────────────────────────────────────────
setInterval(() => {
  const now = Date.now();
  fs.readdirSync(DOWNLOADS_DIR).forEach(file => {
    const filePath = path.join(DOWNLOADS_DIR, file);
    const stat = fs.statSync(filePath);
    if (now - stat.mtimeMs > 30 * 60 * 1000) {
      fs.unlinkSync(filePath);
      console.log(`[Cleanup] Deleted old file: ${file}`);
    }
  });
}, 10 * 60 * 1000); // every 10 minutes

// Start server with error handling
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🎬 Video Downloader running at http://0.0.0.0:${PORT}\n`);
  console.log('Ready to accept connections!\n');
});

// Handle errors
server.on('error', (err) => {
  console.error('Server error:', err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  process.exit(1);
});

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
});
