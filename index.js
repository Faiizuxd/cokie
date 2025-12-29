const express = require('express');
const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

const app = express();
app.use(express.urlencoded({ extended: true }));

let activeCookies = null;
const PORT = process.env.PORT || 8080;
const UA = "Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.91 Mobile Safari/537.36";

app.get('/', (req, res) => {
    res.send(`
    <html>
    <head><title>FAIZU | AUTO BOT</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>body{background:#0b0e14; color:#00ffcc; padding:40px;}</style>
    </head>
    <body>
        <div class="container" style="max-width:500px;">
            <div class="card bg-dark border-info p-4">
                <h3 class="text-center">LOGIN & START</h3>
                <form action="/login" method="POST">
                    <input type="text" name="email" class="form-control mb-2 bg-dark text-white" placeholder="FB Email/Phone" required>
                    <input type="password" name="password" class="form-control mb-3 bg-dark text-white" placeholder="Password" required>
                    <button type="submit" class="btn btn-primary w-100">Login FB</button>
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

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    let browser;
    try {
        browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        await page.setUserAgent(UA);
        await page.goto('https://m.facebook.com/login');
        await page.type('#m_login_email', email);
        await page.type('#m_login_password', password);
        await page.click('button[name="login"]');
        await page.waitForNavigation();
        const cookies = await page.cookies();
        activeCookies = cookies.map(c => `${c.name}=${c.value}`).join('; ');
        res.send(activeCookies.includes('c_user') ? "<h2>Login Success!</h2><a href='/'>Back</a>" : "<h2>Login Failed!</h2>");
    } catch (e) { res.send("Error: " + e.message); }
    finally { if(browser) await browser.close(); }
});

app.post('/start', upload.single('txtFile'), async (req, res) => {
    if (!activeCookies) return res.send("Login first!");
    const { threadId, prefix, delay } = req.body;
    const messages = req.file.buffer.toString().split('\n').filter(m => m.trim());
    res.send("<h2>Bot Started!</h2>");
    
    let index = 0;
    setInterval(async () => {
        if (index >= messages.length) index = 0;
        try {
            const { data } = await axios.get(`https://mbasic.facebook.com/messages/read/?tid=${threadId}`, { headers: { 'Cookie': activeCookies, 'User-Agent': UA }});
            const dtsg = cheerio.load(data)('input[name="fb_dtsg"]').val();
            if (dtsg) {
                await axios.post(`https://mbasic.facebook.com/messages/send/?icm=1&tid=${threadId}`, new URLSearchParams({ fb_dtsg: dtsg, body: `${prefix} ${messages[index]}`, send: 'Send' }), { headers: { 'Cookie': activeCookies, 'User-Agent': UA }});
                console.log("Sent: " + messages[index]);
                index++;
            }
        } catch (e) { console.log("Error: " + e.message); }
    }, delay * 1000);
});

app.listen(PORT, () => console.log(`Live on ${PORT}`));
