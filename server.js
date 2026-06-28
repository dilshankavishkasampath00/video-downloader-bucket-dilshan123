const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const ffmpegPath = require('ffmpeg-static');
const AWS = require('aws-sdk');

// Find yt-dlp executable
function findYtDlp() {
  const isWindows = process.platform === 'win32';
  const pythonCmd = isWindows ? 'python' : 'python3';
  // Prefer running yt-dlp as a Python module (works well in containers)
  try {
    execSync(`${pythonCmd} -m yt_dlp --version`, { stdio: 'ignore' });
    console.log(`[Init] Found yt-dlp via Python module: ${pythonCmd} -m yt_dlp`);
    return { type: 'python', pythonCmd: pythonCmd };
  } catch (e) {
    // Python module not available, continue to check binaries
  }

  const commonPaths = [
    path.join(__dirname, '..', '.venv', 'Scripts', 'yt-dlp.exe'),
    path.join(__dirname, '..', '.venv', 'Scripts', 'yt-dlp'),
    '/usr/local/bin/yt-dlp',
    '/usr/bin/yt-dlp',
    'yt-dlp'
  ];

  for (const pathToCheck of commonPaths) {
    try {
      execSync(`"${pathToCheck}" --version`, { stdio: 'ignore' });
      console.log(`[Init] Found yt-dlp at: ${pathToCheck}`);
      return { type: 'binary', cmd: pathToCheck };
    } catch (e) {
      // Path not found, try next
    }
  }

  // Fallback: shell mode (let the OS resolve PATH) — may still fail if not installed
  console.warn('[Init] yt-dlp not found. Falling back to shell-mode command `yt-dlp`.');
  console.warn('[Init] If running on App Runner, ensure you deploy using the provided Dockerfile or install yt-dlp in the environment.');
  return { type: 'shell', cmd: 'yt-dlp' };
}

const YT_DLP_CONFIG = findYtDlp();

// Helper to spawn yt-dlp with proper configuration
function spawnYtDlp(args) {
  let cmd, spawnArgs, opts;
  
  if (YT_DLP_CONFIG.type === 'python') {
    cmd = YT_DLP_CONFIG.pythonCmd;
    spawnArgs = ['-m', 'yt_dlp', ...args];
    opts = { shell: false };
  } else if (YT_DLP_CONFIG.type === 'shell') {
    cmd = 'yt-dlp';
    spawnArgs = args;
    opts = { shell: true };
  } else {
    // Binary
    cmd = YT_DLP_CONFIG.cmd;
    spawnArgs = args;
    opts = { shell: false };
  }
  
  return spawn(cmd, spawnArgs, opts);
}

function isValidCookiesFilePath(value) {
  return typeof value === 'string' && value.trim().length > 0 && /^[\w\s\.\\/:-]+\.txt$/i.test(value.trim());
}

function buildCookieArgs(body) {
  const cookieArgs = [];
  if (!body) return cookieArgs;

  const cookiesFile = typeof body.cookiesFile === 'string' ? body.cookiesFile.trim() : '';
  const cookiesSource = typeof body.cookiesSource === 'string' ? body.cookiesSource.trim() : '';
  const allowedSources = new Set(['chrome', 'firefox', 'edge', 'brave', 'chromium', 'opera']);

  if (cookiesFile) {
    if (!isValidCookiesFilePath(cookiesFile)) {
      throw new Error('Invalid cookies file path. Use a local cookies.txt file path only.');
    }
    cookieArgs.push('--cookies', cookiesFile);
  } else if (cookiesSource) {
    if (!allowedSources.has(cookiesSource)) {
      throw new Error('Invalid cookies source. Supported values: chrome, firefox, edge, brave, chromium, opera.');
    }
    cookieArgs.push('--cookies-from-browser', cookiesSource);
  }

  return cookieArgs;
}

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

  let args;
  try {
    args = [
      ...buildCookieArgs(req.body),
      '--dump-json',
      '--no-playlist',
      '--ffmpeg-location', ffmpegPath,
      '--no-warnings',
      '--socket-timeout', '30',
      '--retries', '3',
      url
    ];
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  let output = '';
  let errOutput = '';
  let responseSent = false;
  
  try {
    const proc = spawnYtDlp(args);
    
    console.log(`[API/info] Spawned process - PID: ${proc.pid}, Type: ${YT_DLP_CONFIG.type}`);

    // Set timeout to kill process if it hangs
    const timeout = setTimeout(() => {
      if (!responseSent) {
        responseSent = true;
        console.error('[API/info] Process timeout - killing process');
        proc.kill('SIGTERM');
        res.status(500).json({ error: 'yt-dlp request timed out after 60 seconds' });
      }
    }, 60000);

    proc.stdout.on('data', d => { 
      output += d.toString();
      console.log(`[API/info] stdout: ${d.toString().substring(0, 100)}`);
    });
    proc.stderr.on('data', d => { 
      errOutput += d.toString();
      console.log(`[API/info] stderr: ${d.toString().substring(0, 100)}`);
    });

    proc.on('error', (err) => {
      clearTimeout(timeout);
      if (!responseSent) {
        responseSent = true;
        console.error('[API/info] Process error:', err);
        res.status(500).json({ error: `Process error: ${err.message}. Config: ${JSON.stringify(YT_DLP_CONFIG)}` });
      }
    });

    proc.on('close', code => {
      clearTimeout(timeout);
      if (responseSent) return; // Already sent response
      
      console.log(`[API/info] Process exited with code: ${code}`);
      console.log(`[API/info] Output length: ${output.length}, Error output length: ${errOutput.length}`);
      
      if (code !== 0) {
        responseSent = true;
        console.error('[API/info] yt-dlp error output:', errOutput);
        return res.status(500).json({ 
          error: 'Could not fetch video info. Make sure the URL is public and correct.',
          details: errOutput.substring(0, 2000),
          help: 'If this is a login-protected Instagram post, select a browser cookie source or supply a cookies file.',
          debug: { config: YT_DLP_CONFIG, args }
        });
      }
      
      if (!output) {
        responseSent = true;
        console.error('[API/info] No output from yt-dlp! Config:', YT_DLP_CONFIG, 'Args:', args, 'Stderr:', errOutput);
        return res.status(500).json({ error: 'No output from yt-dlp. Check server logs.', details: errOutput.substring(0, 2000), debug: { config: YT_DLP_CONFIG, args } });
      }

      try {
        responseSent = true;
        const info = JSON.parse(output);

        // Build clean format list
        const formats = [];
        const allFormats = (info.formats || []).slice();
        const hasVideo = allFormats.some(f => f.vcodec !== 'none');

        const formatGroups = allFormats.map(f => {
          const hasVideoTrack = f.vcodec !== 'none';
          const hasAudioTrack = f.acodec !== 'none';
          let group = 2;
          if (hasVideoTrack && hasAudioTrack) group = 0;
          else if (hasVideoTrack) group = 1;
          return { format: f, hasVideoTrack, hasAudioTrack, group };
        });

        formatGroups.sort((a, b) => {
          if (a.group !== b.group) return a.group - b.group;
          const aScore = ((a.format.height || 0) * 1000) + (a.format.filesize || 0);
          const bScore = ((b.format.height || 0) * 1000) + (b.format.filesize || 0);
          return bScore - aScore;
        });

        const seen = new Set();
        formatGroups.forEach(({ format: f, hasVideoTrack, hasAudioTrack }) => {
          let label;
          if (hasVideoTrack && hasAudioTrack) {
            label = f.height ? `${f.height}p` : f.format_note || f.format_id;
          } else if (hasVideoTrack) {
            label = f.height ? `${f.height}p (video only)` : `${f.format_note || f.format_id} (video only)`;
          } else if (hasAudioTrack) {
            label = `Audio ${f.ext?.toUpperCase() || 'FILE'}`;
          } else {
            label = `${(f.ext || 'file').toUpperCase()}`;
          }

          if (!seen.has(label)) {
            seen.add(label);
            const note = f.format_note || (hasVideoTrack && !hasAudioTrack ? 'Video only' : !hasVideoTrack && hasAudioTrack ? 'Audio only' : '');
            formats.push({ id: f.format_id, label, ext: f.ext || 'bin', note });
          }
        });

        const bestCompatibleFormatId = 'bestvideo[ext=mp4][vcodec=h264]+bestaudio[ext=m4a]/bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best';
        const bestFormatId = hasVideo ? bestCompatibleFormatId : 'best';
        formats.unshift({ id: bestFormatId, label: 'Best Compatible MP4', ext: 'mp4', note: 'Highest playable quality with audio' });

        res.json({
          title: info.title || 'Media',
          thumbnail: info.thumbnail || null,
          duration: info.duration || 0,
          uploader: info.uploader || info.channel || '',
          platform: info.extractor_key || '',
          formats: formats.slice(0, 8)
        });
      } catch (e) {
        if (!responseSent) {
          responseSent = true;
          console.error('[API/info] JSON parse error:', e.message);
          res.status(500).json({ error: 'Failed to parse video info.' });
        }
      }
    });
  } catch (err) {
    if (!responseSent) {
      responseSent = true;
      console.error('[API/info] Spawn error:', err);
      res.status(500).json({ error: `Failed to spawn yt-dlp: ${err.message}` });
    }
  }
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

  const format = formatId || 'best';

  let args;
  try {
    args = [
      ...buildCookieArgs(req.body),
      '-f', format,
      '--ffmpeg-location', ffmpegPath,
      '--no-playlist',
      '--no-warnings',
      '--newline'
    ];
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  const shouldRecode = format.includes('+') || format.startsWith('bestvideo') || format.includes('bestaudio') || format.includes('bestvideo[ext=mp4]') || format === 'best';
  if (shouldRecode) {
    args.push('--merge-output-format', 'mp4');
  }

  args.push('-o', outputTemplate, url);

  console.log(`[Job ${jobId}] Starting download with config:`, YT_DLP_CONFIG);
  
  try {
    const proc = spawnYtDlp(args);
    
    // Set timeout to kill process if it hangs (2 hours for large downloads)
    const timeout = setTimeout(() => {
      console.error(`[Job ${jobId}] Download timeout - killing process`);
      proc.kill('SIGTERM');
      if (jobs[jobId]) {
        jobs[jobId].status = 'error';
        jobs[jobId].error = 'Download timed out after 2 hours';
      }
    }, 7200000);

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

    proc.on('error', (err) => {
      clearTimeout(timeout);
      console.error(`[${jobId}] Process error:`, err);
      if (jobs[jobId]) {
        jobs[jobId].status = 'error';
        jobs[jobId].error = `Process error: ${err.message}`;
      }
    });

    proc.on('close', async (code) => {
      clearTimeout(timeout);
      if (!jobs[jobId]) return; // Job was deleted
      
      if (code === 0) {
        // Find the output file(s)
        try {
          const files = fs.readdirSync(DOWNLOADS_DIR)
            .filter(f => f.startsWith(jobId) && !f.endsWith('-converted.mp4'));

          if (files.length > 0) {
            let fileName = files[0];
            let filePath = path.join(DOWNLOADS_DIR, fileName);
            const convertedFilePath = path.join(DOWNLOADS_DIR, `${jobId}-converted.mp4`);

            console.log(`[${jobId}] Download finished, starting conversion if needed: ${fileName}`);
            try {
              await transcodeFileToMp4(filePath, convertedFilePath);
              fs.unlinkSync(filePath);
              fs.renameSync(convertedFilePath, filePath);
              console.log(`[${jobId}] Transcoded to H.264/AAC: ${path.basename(filePath)}`);
            } catch (convertErr) {
              console.error(`[${jobId}] Transcode failed, keeping original file:`, convertErr.message);
            }

            jobs[jobId].filename = path.basename(filePath);
            jobs[jobId].status = 'done';
            jobs[jobId].progress = 100;
            jobs[jobId].downloadUrl = `/downloads/${path.basename(filePath)}`;
            
            console.log(`[${jobId}] Done: ${path.basename(filePath)}`);
            uploadToS3(filePath, path.basename(filePath))
              .then(s3Url => {
                if (s3Url && jobs[jobId]) {
                  jobs[jobId].s3Url = s3Url;
                  jobs[jobId].downloadUrl = s3Url; // Prefer S3 URL for persistent access
                  console.log(`[${jobId}] S3 URL: ${s3Url}`);
                }
              })
              .catch(err => {
                console.error(`[${jobId}] S3 upload error:`, err);
                // Fallback to local download still available
              });
          } else {
            jobs[jobId].status = 'error';
            jobs[jobId].error = 'File not found after download.';
          }
        } catch (err) {
          console.error(`[${jobId}] Error checking downloads:`, err);
          jobs[jobId].status = 'error';
          jobs[jobId].error = `Error after download: ${err.message}`;
        }
      } else {
        jobs[jobId].status = 'error';
        jobs[jobId].error = 'Download failed. The video may be private or unavailable.';
      }
    });

    res.json({ jobId });
  } catch (err) {
    console.error(`[Job ${jobId}] Failed to spawn download:`, err);
    jobs[jobId].status = 'error';
    jobs[jobId].error = `Failed to start download: ${err.message}`;
    res.status(500).json({ jobId, error: err.message });
  }
});

// ───────────────────────────────────────────────
// GET /api/progress/:jobId  – poll job status
// ───────────────────────────────────────────────
app.get('/api/progress/:jobId', (req, res) => {
  const job = jobs[req.params.jobId];
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json(job);
});

async function transcodeFileToMp4(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const ffmpegArgs = [
      '-y',
      '-i', inputPath,
      '-c:v', 'libx264',
      '-crf', '23',
      '-preset', 'medium',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart',
      outputPath
    ];

    const ffmpeg = spawn(ffmpegPath, ffmpegArgs, { shell: false });
    let stderr = '';

    ffmpeg.stderr.on('data', data => {
      stderr += data.toString();
    });

    ffmpeg.on('close', code => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`FFmpeg failed with code ${code}: ${stderr}`));
      }
    });

    ffmpeg.on('error', err => {
      reject(err);
    });
  });
}

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
