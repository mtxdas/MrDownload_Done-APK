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

    // কম্বাইন্ড (ভিডিও + অডিও একসাথে) ফরম্যাট ফিল্টার করা
    if (output.formats && Array.isArray(output.formats)) {
      const combinedFormats = output.formats.filter(f => f.url && f.vcodec !== 'none' && f.acodec !== 'none');
      
      if (combinedFormats.length > 0) {
        formatsList = combinedFormats
          .sort((a, b) => (b.height || 0) - (a.height || 0))
          .slice(0, 4) // সর্বোচ্চ ৪টি ভিডিও কোয়ালিটি
          .map((f, index) => ({
            id: index,
            quality: f.height ? `${f.height}p` : (f.format_note || 'HD'),
            url: f.url,
            isAudio: false,
          }));
      }
    }

    if (formatsList.length === 0 && output.url) {
      formatsList.push({
        id: 0,
        quality: output.resolution || '720p (HD)',
        url: output.url,
        isAudio: false,
      });
    }

    // ১টি অডিও ফরম্যাট যোগ করা
    let audioUrl = '';
    if (output.formats && Array.isArray(output.formats)) {
      const audioFormat = output.formats.find(f => f.url && f.vcodec === 'none' && f.acodec !== 'none');
      if (audioFormat) audioUrl = audioFormat.url;
    }
    if (!audioUrl && output.url) audioUrl = output.url;

    formatsList.push({
      id: 'audio_1',
      quality: 'Audio (MP3)',
      url: audioUrl,
      isAudio: true,
    });

    res.json({
      success: true,
      title: output.title || 'Media Video',
      picker: formatsList,
    });

  } catch (error) {
    console.error('Download Error:', error.message);
    res.status(500).json({ success: false, error: 'সার্ভার এই প্ল্যাটফর্ম থেকে ভিডিও প্রসেস করতে ব্যর্থ হয়েছে।' });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
