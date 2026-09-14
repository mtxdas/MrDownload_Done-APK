const express = require('express');
const { exec } = require('child_process');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Multi-Platform Video Downloader Server is Running!');
});

// Video Downloader Endpoint
app.post('/download', (req, res) => {
  const videoUrl = req.body.url;

  if (!videoUrl) {
    return res.status(400).json({ success: false, message: 'URL is required' });
  }

  // Command to fetch direct download link using yt-dlp
  const command = `yt-dlp -g -f best "${videoUrl}"`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Exec Error: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Failed to process video link.',
        error: error.message
      });
    }

    if (stderr) {
      console.warn(`Stderr: ${stderr}`);
    }

    const downloadUrl = stdout.trim();

    res.json({
      success: true,
      message: 'Link extracted successfully',
      download_url: downloadUrl
    });
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
