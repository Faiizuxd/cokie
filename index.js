const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const app = express();

app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 8080;
// Sahi User-Agent jo block nahi hota
const UA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";

app.get('/', (req, res) => {
    res.send(`
    <html>
    <head><title>FAIZU | FINAL SENDER</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>body{background:#000; color:#0f0; padding:40px;} .card{background:#111; border:1px solid #0f0; padding:20px;}</style></head>
    <body>
        <div class="container" style="max-width:500px;">
            <div class="card">
                <h3 class="text-center">FAIZU FINAL SENDER</h3>
                <form action="/start" method="POST" enctype="multipart/form-data">
                    <label>Cookies:</label><textarea name="cookies" class="form-control mb-3" rows="4" required></textarea>
                    <label>Group TID:</label><input type="text" name="threadId" class="form-control mb-3" placeholder="Example: 123456789" required>
                    <label>Hater Name:</label><input type="text" name="prefix" class="form-control mb-3" required>
                    <label>Message File (.txt):</label><input type="file" name="txtFile" class="form-control mb-3" required>
                    <label>Delay (Seconds):</label><input type="number" name="delay" class="form-control mb-3" value="5" required>
                    <button type="submit" class="btn btn-success w-100">START BOT</button>
                </form>
            </div>
        </div>
    </body></html>`);
});

// Helper function to handle requests with correct headers
const fbRequest = async (url, cookies, method = 'get', data = null) => {
    const config = {
        method: method,
        url: url,
        data: data,
        headers: {
            'Cookie': cookies,
            'User-Agent': UA,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1'
        }
    };
    return axios(config);
};

app.post('/start', upload.single('txtFile'), async (req, res) => {
    const { cookies, threadId, prefix, delay } = req.body;
    let tid = threadId.trim();
    if (!tid.includes('cid.g.')) tid = "cid.g." + tid;

    const messages = req.file.buffer.toString().split('\n').filter(m => m.trim() !== "");
    res.send("<h2>Bot Started Successfully! Logs check karein.</h2>");

    let index = 0;
    const runLoop = async () => {
        try {
            if (index >= messages.length) index = 0;

            // Step 1: Get DTSG
            const chatPage = await fbRequest(`https://mbasic.facebook.com/messages/read/?tid=${tid}`, cookies);
            const $ = cheerio.load(chatPage.data);
            const dtsg = $('input[name="fb_dtsg"]').val();
            const jazoest = $('input[name="jazoest"]').val();

            if (!dtsg) {
                console.log(`[!] Auth Fail: DTSG nahi mila. Account Checkpoint par ho sakta hai.`);
            } else {
                // Step 2: Send Message
                const msg = `${prefix} ${messages[index]}`;
                const params = new URLSearchParams();
                params.append('fb_dtsg', dtsg);
                params.append('jazoest', jazoest);
                params.append('body', msg);
                params.append('send', 'Send');

                const postRes = await fbRequest(`https://mbasic.facebook.com/messages/send/?icm=1&tid=${tid}`, cookies, 'post', params);
                
                if (postRes.data.includes('message_') || postRes.status === 200) {
                    console.log(`[OK] Message ${index + 1} Sent: ${msg}`);
                }
            }
        } catch (err) {
            console.log(`[ERR] Connection Error: ${err.message}`);
        }
        index++;
        setTimeout(runLoop, delay * 1000);
    };

    runLoop();
});

app.listen(PORT, () => console.log(`Active on Port ${PORT}`));
