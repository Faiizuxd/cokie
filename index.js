const express = require('express');
const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

const app = express();
app.use(express.urlencoded({ extended: true }));

let savedCookies = null;
const PORT = process.env.PORT || 8080;
const UA = "Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.91 Mobile Safari/537.36";

// --- HTML Dashboard ---
app.get('/', (req, res) => {
    res.send(`
    <html>
    <head><title>FAIZU | AUTO LOGIN</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>body{background:#0b0e14; color:#00ffcc; padding:40px; font-family:sans-serif;}</style>
    </head>
    <body>
        <div class="container" style="max-width:500px;">
            <div class="card bg-dark border-info p-4">
                <h3 class="text-center">FAIZU AUTO BOT</h3>
                <hr class="border-info">
                <form action="/login" method="POST">
                    <label>FB Email/Phone:</label>
                    <input type="text" name="email" class="form-control mb-2 bg-dark text-white" required>
                    <label>FB Password:</label>
                    <input type="password" name="password" class="form-control mb-3 bg-dark text-white" required>
                    <button type="submit" class="btn btn-primary w-100">Login & Save Session</button>
                </form>
                <hr class="border-info">
                <form action="/start" method="POST" enctype="multipart/form-data">
                    <input type="text" name="threadId" class="form-control mb-2 bg-dark text-white" placeholder="Group TID (cid.g.xxx)" required>
                    <input type="text" name="prefix" class="form-control mb-2 bg-dark text-white" placeholder="Hater Name" required>
                    <input type="file" name="txtFile" class="form-control mb-2 bg-dark text-white" required>
                    <input type="number" name="delay" class="form-control mb-3 bg-dark text-white" value="5">
                    <button type="submit" class="btn btn-success w-100">START ATTACK</button>
                </form>
            </div>
        </div>
    </body></html>`);
});

// --- Step 1: Background Login ---
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    let browser;
    try {
        browser = await puppeteer.launch({ 
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            headless: "new"
        });
        const page = await browser.newPage();
        await page.setUserAgent(UA);
        
        await page.goto('https://m.facebook.com/login', { waitUntil: 'networkidle2' });
        await page.type('#m_login_email', email);
        await page.type('#m_login_password', password);
        await page.click('button[name="login"]');
        
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        
        const cookies = await page.cookies();
        savedCookies = cookies.map(c => `${c.name}=${c.value}`).join('; ');
        
        if (savedCookies.includes('c_user')) {
            console.log("[+] Login Success & Cookies Captured!");
            res.send("<h2>Login Success! Now fill other details and Start Bot.</h2><a href='/'>Back</a>");
        } else {
            res.send("<h2>Login Failed. Check Email/Password or 2FA.</h2><a href='/'>Try Again</a>");
        }
    } catch (e) {
        res.send("Error: " + e.message);
    } finally {
        if (browser) await browser.close();
    }
});

// --- Step 2: Sending Logic (Using Captured Cookies) ---
app.post('/start', upload.single('txtFile'), async (req, res) => {
    if (!savedCookies) return res.send("Please login first!");
    const { threadId, prefix, delay } = req.body;
    const messages = req.file.buffer.toString().split('\n').filter(m => m.trim() !== "");
    
    res.send("<h2>Bot Started! Monitor logs on Render.</h2>");
    
    let index = 0;
    const loop = async () => {
        if (index >= messages.length) index = 0;
        try {
            const pageRes = await axios.get(`https://mbasic.facebook.com/messages/read/?tid=${threadId}`, {
                headers: { 'Cookie': savedCookies, 'User-Agent': UA }
            });
            const $ = cheerio.load(pageRes.data);
            const dtsg = $('input[name="fb_dtsg"]').val();
            
            if (dtsg) {
                const msg = `${prefix} ${messages[index]}`;
                const params = new URLSearchParams({ fb_dtsg: dtsg, body: msg, send: 'Send' });
                await axios.post(`https://mbasic.facebook.com/messages/send/?icm=1&tid=${threadId}`, params, {
                    headers: { 'Cookie': savedCookies, 'User-Agent': UA }
                });
                console.log(`[SENT] ${msg}`);
                index++;
            }
        } catch (e) { console.log("Loop Error: " + e.message); }
        setTimeout(loop, delay * 1000);
    };
    loop();
});

app.listen(PORT, () => console.log(`Live on ${PORT}`));
