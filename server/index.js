const express = require('express');
const cors = require('cors');
const youtubeDl = require('yt-dlp-exec');

const app = express();
app.use(cors());
app.use(express.json());

// সার্ভার চেক করার জন্য
app.get('/', (req, res) => res.send('Server is active!'));

app.post('/download', async (req, res) => {
  const { videoUrl } = req.body;
  try {
    const output = await youtubeDl(videoUrl, {
      dumpSingleJson: true,
      noCheckCertificates: true,
      addHeader: ['User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36']
    });

    const downloadUrl = output.url || (output.formats && output.formats.reverse().find(f => f.url)?.url);

    res.json({
      success: true,
      download_url: downloadUrl,
      title: output.title || 'Video'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'লিঙ্ক এক্সট্রাক্ট করতে ব্যর্থ', error: error.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
