const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const app = express();

app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 8080;
const UA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36";

// --- HTML Dashboard ---
const htmlForm = `
<!DOCTYPE html>
<html>
<head>
    <title>FAIZU | NODE COOKIE BOT</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body { background: #0d1117; color: #58a6ff; padding: 50px; }
        .box { background: #161b22; padding: 30px; border-radius: 10px; border: 1px solid #30363d; box-shadow: 0 0 20px rgba(0,0,0,0.5); }
        .btn-start { background: #238636; color: white; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container" style="max-width: 500px;">
        <div class="box">
            <h2 class="text-center mb-4">FAIZU NODE BOT</h2>
            <form action="/start" method="POST" enctype="multipart/form-data">
                <div class="mb-3"><label>Enter Full Cookies:</label>
                <textarea name="cookies" class="form-control bg-dark text-white" rows="3" required></textarea></div>
                <div class="mb-3"><label>Thread ID:</label>
                <input type="text" name="threadId" class="form-control bg-dark text-white" required></div>
                <div class="mb-3"><label>Hater Name (Prefix):</label>
                <input type="text" name="prefix" class="form-control bg-dark text-white" required></div>
                <div class="mb-3"><label>Select Message File (.txt):</label>
                <input type="file" name="txtFile" class="form-control bg-dark text-white" required></div>
                <div class="mb-3"><label>Delay (Seconds):</label>
                <input type="number" name="delay" class="form-control bg-dark text-white" value="5" required></div>
                <button type="submit" class="btn btn-start w-100">START BOT</button>
            </form>
        </div>
    </div>
</body>
</html>
`;

app.get('/', (req, res) => res.send(htmlForm));

// --- Sending Logic ---
async function sendMessage(cookies, tid, message) {
    try {
        const headers = {
            'Cookie': cookies,
            'User-Agent': UA,
            'Referer': `https://mbasic.facebook.com/messages/read/?tid=${tid}`
        };

        // 1. Get fb_dtsg token
        const res = await axios.get(`https://mbasic.facebook.com/messages/read/?tid=${tid}`, { headers });
        const $ = cheerio.load(res.data);
        const fb_dtsg = $('input[name="fb_dtsg"]').val();

        if (!fb_dtsg) return { success: false, error: "fb_dtsg not found (Cookie Expired?)" };

        // 2. Post Message
        const formData = new URLSearchParams();
        formData.append('fb_dtsg', fb_dtsg);
        formData.append('body', message);
        formData.append('send', 'Send');

        const postRes = await axios.post(`https://mbasic.facebook.com/messages/send/?icm=1&tid=${tid}`, formData, { headers });
        
        return { success: postRes.status === 200 };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

app.post('/start', upload.single('txtFile'), (req, res) => {
    const { cookies, threadId, prefix, delay } = req.body;
    const messages = req.file.buffer.toString().split('\n').filter(m => m.trim() !== "");

    let index = 0;
    console.log(`[*] Bot Started for Thread: ${threadId}`);

    // Background Loop
    const interval = setInterval(async () => {
        if (index >= messages.length) index = 0; // Restart if finished

        const fullMsg = `${prefix} ${messages[index]}`;
        const result = await sendMessage(cookies, threadId, fullMsg);

        if (result.success) {
            console.log(`[SUCCESS] Sent: ${fullMsg}`);
        } else {
            console.log(`[FAILED] ${result.error || "Unknown Error"}`);
        }
        index++;
    }, delay * 1000);

    res.send("<h2>Script Started!</h2><p>Check logs on Render dashboard.</p><a href='/'>Back</a>");
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
