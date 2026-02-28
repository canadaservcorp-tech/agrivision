const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const auth = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

// ============ PHOTOS ============

// GET /api/v1/timelapse/:farmId/photos — List captured photos
router.get('/:farmId/photos', auth, async (req, res) => {
  try {
    const { limit = 100, offset = 0, start_date, end_date } = req.query;

    let query = `SELECT * FROM captured_photos WHERE farm_id = $1`;
    const params = [req.params.farmId];
    let paramIdx = 2;

    if (start_date) {
      query += ` AND captured_at >= $${paramIdx++}`;
      params.push(start_date);
    }
    if (end_date) {
      query += ` AND captured_at <= $${paramIdx++}`;
      params.push(end_date);
    }

    query += ` ORDER BY captured_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);

    // Get total count
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM captured_photos WHERE farm_id = $1', [req.params.farmId]
    );

    res.json({
      success: true,
      data: result.rows,
      total: parseInt(countResult.rows[0].count),
    });
  } catch (err) {
    console.error('Photos list error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch photos' });
  }
});

// POST /api/v1/timelapse/:farmId/photos — Upload photo from hardware module
router.post('/:farmId/photos', auth, async (req, res) => {
  try {
    const { image_url, thumbnail_url, temperature, humidity,
            has_disease_alert, disease_type, file_size_kb, source } = req.body;

    const result = await pool.query(
      `INSERT INTO captured_photos
       (id, farm_id, captured_at, image_url, thumbnail_url,
        temperature, humidity, has_disease_alert, disease_type,
        file_size_kb, source)
       VALUES ($1, $2, NOW(), $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [uuidv4(), req.params.farmId, image_url, thumbnail_url,
       temperature, humidity, has_disease_alert || false,
       disease_type, file_size_kb || 0, source || 'scheduled']
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Photo upload error:', err);
    res.status(500).json({ success: false, error: 'Failed to save photo' });
  }
});

// ============ TIME-LAPSE VIDEOS ============

// GET /api/v1/timelapse/:farmId/videos — List generated videos
router.get('/:farmId/videos', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM timelapse_videos WHERE farm_id = $1 ORDER BY created_at DESC`,
      [req.params.farmId]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch videos' });
  }
});

// POST /api/v1/timelapse/:farmId/generate — Start time-lapse generation
router.post('/:farmId/generate', auth, async (req, res) => {
  try {
    const { start_date, end_date, fps, resolution, show_logo,
            show_timestamp, show_weather, farm_name, farm_logo_url } = req.body;

    if (!start_date || !end_date) {
      return res.status(400).json({ success: false, error: 'start_date and end_date required' });
    }

    // Count available photos in range
    const photoCount = await pool.query(
      `SELECT COUNT(*) FROM captured_photos
       WHERE farm_id = $1 AND captured_at >= $2 AND captured_at <= $3`,
      [req.params.farmId, start_date, end_date]
    );

    const count = parseInt(photoCount.rows[0].count);
    if (count < 2) {
      return res.status(400).json({
        success: false,
        error: `Not enough photos in range (found ${count}, need at least 2)`,
      });
    }

    // Create job
    const jobId = uuidv4();
    await pool.query(
      `INSERT INTO timelapse_jobs
       (id, farm_id, user_id, start_date, end_date, fps, resolution,
        show_logo, show_timestamp, show_weather, farm_name, farm_logo_url,
        photo_count, status, progress, status_text)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'processing', 0.1, 'Starting...')`,
      [jobId, req.params.farmId, req.user.id, start_date, end_date,
       fps || 10, resolution || '1080p', show_logo !== false,
       show_timestamp !== false, show_weather || false,
       farm_name, farm_logo_url, count]
    );

    // Start async generation (non-blocking)
    generateTimelapseAsync(jobId, req.params.farmId, {
      start_date, end_date, fps: fps || 10, resolution: resolution || '1080p',
      show_logo: show_logo !== false, show_timestamp: show_timestamp !== false,
      show_weather: show_weather || false, farm_name, farm_logo_url,
    }).catch(err => console.error('Timelapse generation error:', err));

    res.status(202).json({
      success: true,
      data: { job_id: jobId, photo_count: count, status: 'processing' },
    });
  } catch (err) {
    console.error('Generate timelapse error:', err);
    res.status(500).json({ success: false, error: 'Failed to start generation' });
  }
});

// GET /api/v1/timelapse/:farmId/jobs/:jobId — Poll job status
router.get('/:farmId/jobs/:jobId', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT j.*, v.id as video_id, v.video_url, v.thumbnail_url as vid_thumb,
              v.duration_seconds, v.file_size_mb
       FROM timelapse_jobs j
       LEFT JOIN timelapse_videos v ON v.job_id = j.id
       WHERE j.id = $1 AND j.farm_id = $2`,
      [req.params.jobId, req.params.farmId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    const job = result.rows[0];
    const response = {
      status: job.status,
      progress: parseFloat(job.progress),
      status_text: job.status_text,
      error: job.error_message,
    };

    if (job.status === 'completed' && job.video_id) {
      response.video = {
        id: job.video_id,
        start_date: job.start_date,
        end_date: job.end_date,
        photo_count: job.photo_count,
        fps: job.fps,
        resolution: job.resolution,
        duration_seconds: job.duration_seconds,
        video_url: job.video_url,
        thumbnail_url: job.vid_thumb,
        has_logo: job.show_logo,
        file_size_mb: job.file_size_mb,
        created_at: job.created_at,
      };
    }

    res.json({ success: true, data: response });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to get job status' });
  }
});

// DELETE /api/v1/timelapse/videos/:videoId — Delete a video
router.delete('/videos/:videoId', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM timelapse_videos WHERE id = $1 RETURNING video_path`,
      [req.params.videoId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ success: false, error: 'Video not found' });
    }

    // Delete file from disk
    const filePath = result.rows[0].video_path;
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({ success: true, message: 'Video deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to delete video' });
  }
});

// ============ CCTV MODE ============

// GET /api/v1/timelapse/:farmId/cctv/status — CCTV mode status
router.get('/:farmId/cctv/status', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT cctv_enabled, cctv_external_drive_detected, cctv_drive_label,
              cctv_drive_capacity_gb, cctv_drive_used_gb, cctv_recording_count,
              cctv_last_recording
       FROM farm_devices WHERE farm_id = $1`,
      [req.params.farmId]
    );

    if (!result.rows.length) {
      return res.json({ success: true, data: { enabled: false, external_drive_detected: false } });
    }

    const device = result.rows[0];
    res.json({
      success: true,
      data: {
        enabled: device.cctv_enabled,
        external_drive_detected: device.cctv_external_drive_detected,
        drive_label: device.cctv_drive_label,
        drive_capacity_gb: device.cctv_drive_capacity_gb,
        drive_used_gb: device.cctv_drive_used_gb,
        recording_count: device.cctv_recording_count,
        last_recording: device.cctv_last_recording,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to get CCTV status' });
  }
});

// POST /api/v1/timelapse/:farmId/cctv — Toggle CCTV mode
router.post('/:farmId/cctv', auth, async (req, res) => {
  try {
    const { enabled } = req.body;
    await pool.query(
      `UPDATE farm_devices SET cctv_enabled = $1 WHERE farm_id = $2`,
      [enabled, req.params.farmId]
    );
    res.json({ success: true, data: { enabled } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update CCTV mode' });
  }
});

// ============ ASYNC VIDEO GENERATION ============

async function generateTimelapseAsync(jobId, farmId, options) {
  const updateProgress = async (progress, statusText) => {
    await pool.query(
      `UPDATE timelapse_jobs SET progress = $1, status_text = $2 WHERE id = $3`,
      [progress, statusText, jobId]
    );
  };

  try {
    // 1. Fetch photos from DB
    await updateProgress(0.15, 'Fetching photo list...');
    const photos = await pool.query(
      `SELECT id, image_url, captured_at, temperature, humidity
       FROM captured_photos
       WHERE farm_id = $1 AND captured_at >= $2 AND captured_at <= $3
       ORDER BY captured_at ASC`,
      [farmId, options.start_date, options.end_date]
    );

    const photoList = photos.rows;
    await updateProgress(0.2, `Found ${photoList.length} photos`);

    // 2. Create temp directory for frames
    const tempDir = path.join('/tmp', `timelapse-${jobId}`);
    fs.mkdirSync(tempDir, { recursive: true });

    // 3. Download and process each frame
    const resMap = { '1080p': '1920:1080', '4K': '3840:2160', '24MP': '6000:4000' };
    const scale = resMap[options.resolution] || '3840:2160';

    for (let i = 0; i < photoList.length; i++) {
      const photo = photoList[i];
      const frameNum = String(i).padStart(6, '0');
      const framePath = path.join(tempDir, `frame_${frameNum}.jpg`);

      // Download photo (from S3/local storage)
      await downloadFrame(photo.image_url, framePath);

      // Add overlays using ffmpeg if needed
      if (options.show_timestamp || options.show_logo || options.show_weather) {
        await addOverlays(framePath, {
          timestamp: options.show_timestamp ? photo.captured_at : null,
          farmName: options.show_logo ? options.farm_name : null,
          logoUrl: options.show_logo ? options.farm_logo_url : null,
          temperature: options.show_weather ? photo.temperature : null,
          humidity: options.show_weather ? photo.humidity : null,
        });
      }

      if (i % 10 === 0) {
        const progress = 0.2 + (i / photoList.length) * 0.5;
        await updateProgress(progress, `Processing frame ${i + 1}/${photoList.length}`);
      }
    }

    // 4. Generate video with ffmpeg
    await updateProgress(0.75, 'Encoding video...');

    const outputDir = process.env.TIMELAPSE_STORAGE_PATH || '/var/agrivision/timelapse';
    fs.mkdirSync(outputDir, { recursive: true });

    const videoFilename = `timelapse_${farmId}_${Date.now()}.mp4`;
    const videoPath = path.join(outputDir, videoFilename);

    const ffmpegCmd = [
      'ffmpeg', '-y',
      '-framerate', String(options.fps),
      '-i', path.join(tempDir, 'frame_%06d.jpg'),
      '-vf', `scale=${scale}:force_original_aspect_ratio=decrease,pad=${scale}:(ow-iw)/2:(oh-ih)/2`,
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '23',
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      videoPath,
    ].join(' ');

    await execAsync(ffmpegCmd);
    await updateProgress(0.9, 'Finalizing...');

    // 5. Get video file stats
    const stats = fs.statSync(videoPath);
    const fileSizeMb = (stats.size / (1024 * 1024)).toFixed(1);
    const durationSeconds = Math.ceil(photoList.length / options.fps);

    // Generate thumbnail from first frame
    const thumbFilename = `thumb_${farmId}_${Date.now()}.jpg`;
    const thumbPath = path.join(outputDir, thumbFilename);
    await execAsync(`ffmpeg -y -i ${videoPath} -vframes 1 -vf scale=320:-1 ${thumbPath}`);

    // 6. Save video record
    const videoId = uuidv4();
    const videoUrl = `/storage/timelapse/${videoFilename}`;
    const thumbUrl = `/storage/timelapse/${thumbFilename}`;

    await pool.query(
      `INSERT INTO timelapse_videos
       (id, farm_id, job_id, start_date, end_date, photo_count, fps,
        resolution, duration_seconds, video_url, video_path, thumbnail_url,
        has_logo, has_timestamp, has_weather, file_size_mb)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
      [videoId, farmId, jobId, options.start_date, options.end_date,
       photoList.length, options.fps, options.resolution, durationSeconds,
       videoUrl, videoPath, thumbUrl, options.show_logo,
       options.show_timestamp, options.show_weather, fileSizeMb]
    );

    // 7. Cleanup temp frames
    fs.rmSync(tempDir, { recursive: true, force: true });

    // 8. Mark job complete
    await pool.query(
      `UPDATE timelapse_jobs SET status = 'completed', progress = 1.0,
       status_text = 'Complete' WHERE id = $1`, [jobId]
    );

  } catch (err) {
    console.error('Timelapse generation failed:', err);
    await pool.query(
      `UPDATE timelapse_jobs SET status = 'failed', error_message = $1,
       status_text = 'Failed' WHERE id = $2`,
      [err.message, jobId]
    );
  }
}

async function downloadFrame(imageUrl, destPath) {
  // If local path, just copy
  if (imageUrl.startsWith('/')) {
    fs.copyFileSync(imageUrl, destPath);
    return;
  }
  // If S3/URL, download
  const https = require('https');
  const http = require('http');
  const client = imageUrl.startsWith('https') ? https : http;

  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    client.get(imageUrl, (response) => {
      response.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', reject);
  });
}

async function addOverlays(framePath, overlays) {
  const filters = [];

  if (overlays.timestamp) {
    const ts = new Date(overlays.timestamp).toISOString().replace('T', ' ').substring(0, 19);
    filters.push(
      `drawtext=text='${ts}':x=w-tw-20:y=h-th-20:fontsize=24:fontcolor=white:borderw=2:bordercolor=black`
    );
  }

  if (overlays.farmName) {
    filters.push(
      `drawtext=text='${overlays.farmName}':x=20:y=20:fontsize=28:fontcolor=white:borderw=2:bordercolor=black`
    );
  }

  if (overlays.temperature != null) {
    const weatherText = `${overlays.temperature}°C  ${overlays.humidity || '--'}%`;
    filters.push(
      `drawtext=text='${weatherText}':x=20:y=h-th-20:fontsize=22:fontcolor=white:borderw=2:bordercolor=black`
    );
  }

  if (filters.length === 0) return;

  const tempOut = framePath + '.tmp.jpg';
  const cmd = `ffmpeg -y -i ${framePath} -vf "${filters.join(',')}" ${tempOut}`;
  await execAsync(cmd);
  fs.renameSync(tempOut, framePath);
}

module.exports = router;
