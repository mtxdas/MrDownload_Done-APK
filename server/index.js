const express = require('express');
const cors = require('cors');
const youtubeDl = require('yt-dlp-exec');

const app = express();
app.use(cors());
app.use(express.json());

// সার্ভার চেক করার রুট
app.get('/', (req, res) => res.send('Server is active!'));

app.post('/download', async (req, res) => {
  const videoUrl = req.body.videoUrl || req.body.url;
  if (!videoUrl) {
    return res.status(400).json({ success: false, error: 'কোনো ভিডিও লিংক প্রদান করা হয়নি।' });
  }

  try {
    // yt-dlp দিয়ে সব ফরম্যাট এবং বিস্তারিত ফেচ করা
    const output = await youtubeDl(videoUrl, {
      dumpSingleJson: true,
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
      addHeader: ['User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'],
    });

    // ফরম্যাট বা পিকার লিস্ট তৈরি করা
    let formatsList = [];
    if (output.formats && Array.isArray(output.formats)) {
      formatsList = output.formats
        .filter(f => f.url && (f.vcodec !== 'none' || f.acodec !== 'none'))
        .map((f, index) => ({
          id: index,
          quality: f.format_note || f.resolution || `${f.height || 'Auto'}p`,
          url: f.url,
          isAudio: f.vcodec === 'none' && f.acodec !== 'none',
        }));
    }

    // যদি ফরম্যাট লিস্ট না পাওয়া যায়, তবে মূল ডাউনলোডার লিংক ব্যবহার করা
    if (formatsList.length === 0 && output.url) {
      formatsList.push({
        id: 0,
        quality: output.resolution || 'HD / Default',
        url: output.url,
        isAudio: false,
      });
    }

    if (formatsList.length === 0) {
      return res.status(400).json({ success: false, error: 'এই ভিডিওটির কোনো ডাউনলোডযোগ্য ফরম্যাট পাওয়া যায়নি।' });
    }

    res.json({
      success: true,
      title: output.title || 'Media Video',
      picker: formatsList,
    });

  } catch (error) {
    console.error('Download Error:', error.message);
    res.status(500).json({ success: false, error: 'সার্ভার ভিডিও প্রসেস করতে ব্যর্থ হয়েছে। লিংকটি সঠিক কি না চেক করুন।' });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
