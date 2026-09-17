// Video Downloader Endpoint
app.post('/download', async (req, res) => {
  const { videoUrl } = req.body;

  if (!videoUrl) {
    return res.status(400).json({ success: false, message: 'URL is required' });
  }

  try {
    const output = await youtubeDl(videoUrl, {
      getUrl: true,
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
      addHeader: ['referer:youtube.com', 'user-agent:googlebot']
    });

    // output সাধারণত একটি স্ট্রিং লিংক রিটার্ন করে যদি getUrl: true থাকে
    const downloadUrl = typeof output === 'string' ? output.trim() : String(output).trim();

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
