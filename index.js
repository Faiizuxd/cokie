const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const app = express();

app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 8080;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36";

// UI Template
const htmlForm = `
<!DOCTYPE html>
<html>
<head>
    <title>GROUP BOT | COOKIE</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body { background-color: #0b0e14; color: #00ffcc; font-family: 'Courier New', Courier, monospace; }
        .container { margin-top: 50px; max-width: 500px; }
        .card { background: #161b22; border: 1px solid #00ffcc; box-shadow: 0 0 15px #00ffcc; padding: 20px; border-radius: 10px; }
        .form-control { background: #0d1117; color: white; border: 1px solid #30363d; }
        .btn-custom { background: #00ffcc; color: black; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="card">
            <h3 class="text-center">FAIZU COOKIE SENDER</h3>
            <form action="/start" method="POST" enctype="multipart/form-data">
                <div class="mb-3"><label>Cookies:</label><textarea name="cookies" class="form-control" rows="3" placeholder="c_user=...; xs=...; datr=..." required></textarea></div>
                <div class="mb-3"><label>Group/Thread ID:</label><input type="text" name="threadId" class="form-control" placeholder="Group UID or Thread ID" required></div>
                <div class="mb-3"><label>Hater Name:</label><input type="text" name="prefix" class="form-control" required></div>
                <div class="mb-3"><label>Message File (.txt):</label><input type="file" name="txtFile" class="form-control" required></div>
                <div class="mb-3"><label>Delay (Seconds):</label><input type="number" name="delay" class="form-control" value="5" required></div>
                <button type="submit" class="btn btn-custom w-100">RUN SCRIPT</button>
            </form>
        </div>
    </div>
</body>
</html>
`;

app.get('/', (req, res) => res.send(htmlForm));

async function getFbDtsg(cookies, tid) {
    try {
        const url = `https://mbasic.facebook.com/messages/read/?tid=${tid}`;
        const res = await axios.get(url, {
            headers: { 'Cookie': cookies, 'User-Agent': UA }
        });
        const $ = cheerio.load(res.data);
        return $('input[name="fb_dtsg"]').val();
    } catch (e) {
        return null;
    }
}

async function sendGroupMessage(cookies, tid, message) {
    try {
        const dtsg = await getFbDtsg(cookies, tid);
        if (!dtsg) return { success: false, error: "Auth Fail (Cookie Expired or Wrong TID)" };

        const postUrl = `https://mbasic.facebook.com/messages/send/?icm=1&tid=${tid}`;
        const formData = new URLSearchParams();
        formData.append('fb_dtsg', dtsg);
        formData.append('body', message);
        formData.append('send', 'Send');

        const response = await axios.post(postUrl, formData, {
            headers: {
                'Cookie': cookies,
                'User-Agent': UA,
                'Referer': `https://mbasic.facebook.com/messages/read/?tid=${tid}`
            }
        });

        // Check if message actually appears in response
        return { success: response.status === 200 && response.data.includes('message_') };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

app.post('/start', upload.single('txtFile'), (req, res) => {
    const { cookies, threadId, prefix, delay } = req.body;
    const messages = req.file.buffer.toString().split('\n').filter(m => m.trim() !== "");

    let index = 0;
    console.log(`[!] Bot Started on TID: ${threadId}`);

    const interval = setInterval(async () => {
        if (index >= messages.length) index = 0;

        const msgToSend = `${prefix} ${messages[index]}`;
        const result = await sendGroupMessage(cookies, threadId, msgToSend);

        if (result.success) {
            console.log(`[OK] SENT: ${msgToSend}`);
        } else {
            console.log(`[ERROR] ${result.error || "Failed to send"}`);
        }
        index++;
    }, delay * 1000);

    res.send("<h2>Bot is Running!</h2><p>Check logs in Render.</p>");
});

app.listen(PORT, () => console.log(`Active on Port ${PORT}`));
