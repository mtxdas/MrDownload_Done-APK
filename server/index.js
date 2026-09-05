const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('MR Download Server is Running!');
});

// Instagram Downloader API Endpoint
app.post('/api/download', async (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    try {
        // এখানে আপনার Instagram API রিকোয়েস্ট লজিক বসবে
        res.json({ message: 'Request received', url });
    } catch (error) {
        res.status(500).json({ error: 'Failed to process request' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
