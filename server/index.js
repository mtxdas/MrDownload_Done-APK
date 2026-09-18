const express = require('express');
const cors = require('cors');
const youtubeDl = require('yt-dlp-exec');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => res.send('Server is active!'));

app.post('/download', async (req, res) => {
  const videoUrl = req.body.videoUrl || req.body.url;
  if (!videoUrl) {
    return res.status(400).json({ success: false, error: 'কোনো ভিডিও লিংক প্রদান করা হয়নি।' });
  }

  try {
    const output = await youtubeDl(videoUrl, {
      dumpSingleJson: true,
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
      geoBypass: true,
      addHeader: [
        'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept-Language: en-US,en;q=0.9',
      ],
    });

    let formatsList = [];

    if (output.formats && Array.isArray(output.formats)) {
      // ১. যেগুলোতে ভিডিও এবং অডিও দুটোই আছে (Combined formats) অথবা ভালো ভিডিও রেজুলেশন আছে
      const videoFormats = output.formats.filter(f => f.url && f.height && f.vcodec !== 'none');
      
      // রেজুলেশন অনুযায়ী সাজানো (বড় থেকে ছোট: 1080p, 720p, 480p...)
      const uniqueHeights = [...new Set(videoFormats.map(f => f.height))]
        .sort((a, b) => b - a);

      uniqueHeights.forEach((height, index) => {
        const match = videoFormats.find(f => f.height === height);
        if (match) {
          formatsList.push({
            id: `video_${height}_${index}`,
            quality: `${height}p`,
            url: match.url,
            isAudio: false,
          });
        }
      });

      // ২. অডিও ফরম্যাট আলাদা করা
      const audioFormats = output.formats.filter(f => f.url && f.vcodec === 'none' && f.acodec !== 'none');
      if (audioFormats.length > 0) {
        formatsList.push({
          id: 'audio_mp3',
          quality: 'MP3',
          url: audioFormats[0].url,
          isAudio: true,
        });
      }
    }

    // যদি কোনো কারণে ফরম্যাট লিস্ট খালি থাকে
    if (formatsList.length === 0 && output.url) {
      formatsList.push({
        id: 'default_video',
        quality: '720p',
        url: output.url,
        isAudio: false,
      });
      formatsList.push({
        id: 'default_audio',
        quality: 'MP3',
        url: output.url,
        isAudio: true,
      });
    }

    res.json({
      success: true,
      title: output.title || 'Media Video',
      picker: formatsList,
    });

  } catch (error) {
    console.error('Download Error:', error.message);
    res.status(500).json({ success: false, error: 'সার্ভার এই লিংক থেকে ডাটা প্রসেস করতে ব্যর্থ হয়েছে।' });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
