const express = require('express');
const cors = require('cors');
const youtubeDl = require('yt-dlp-exec');

const app = express();

app.use(cors());
app.use(express.json());

// Basic URL validation helper
const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch (err) {
    return false;
  }
};

// Video Downloader Endpoint
app.post('/download', async (req, res) => {
  const { videoUrl } = req.body;

  if (!videoUrl) {
    return res.status(400).json({ success: false, message: 'URL is required' });
  }

  // ইউআরএল সঠিক কিনা যাচাই করা
  if (!isValidUrl(videoUrl)) {
    return res.status(400).json({ success: false, message: 'Invalid URL format' });
  }

  try {
    const output = await youtubeDl(videoUrl, {
      getUrl: true,
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
      addHeader: ['referer:youtube.com', 'user-agent:googlebot']
    });

    const downloadUrl = typeof output === 'string' ? output.trim() : String(output).trim();

    if (!downloadUrl) {
      throw new Error('Could not extract direct download link.');
    }

    return res.json({
      success: true,
      message: 'Link extracted successfully',
      download_url: downloadUrl
    });

  } catch (error) {
    console.error('Download Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to process video link.',
      error: error.message
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
