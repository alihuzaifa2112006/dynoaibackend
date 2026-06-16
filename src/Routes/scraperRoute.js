// backend/src/Routes/scraper.routes.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
const multer = require('multer');
const FormData = require('form-data');

const upload = multer({ storage: multer.memoryStorage() });
const PYTHON_TIMEOUT_MS = 180000;
const MAX_PYTHON_RETRIES = 4;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function getPythonBaseUrl(pythonApiUrl) {
    try {
        const parsed = new URL(pythonApiUrl);
        return `${parsed.protocol}//${parsed.host}`;
    } catch {
        return null;
    }
}

function getPythonPdfUploadUrl() {
    const base = getPythonBaseUrl(process.env.PYTHON_API_URL);
    if (!base) return null;
    return `${base}/api/scraper/UploadPdfByHuzaifa`;
}

function formatProxyError(error, fallback = 'Python API error') {
    if (error.response) {
        const data = error.response.data;
        const status = error.response.status;

        if ([502, 503, 504].includes(status)) {
            return {
                status,
                body: {
                    success: false,
                    error: 'Python backend abhi wake up ho raha hai (Render free tier). 1-2 minute wait karke dubara try karo.',
                },
            };
        }

        const message = data?.detail || data?.error || data?.message || fallback;
        return { status, body: { success: false, error: message } };
    }

    return {
        status: 503,
        body: {
            success: false,
            error: `Python backend unreachable. PYTHON_API_URL aur INTERNAL_SECRET_KEY Render par check karo. (${error.message || 'connection failed'})`,
        },
    };
}

async function wakePythonBackend(pythonApiUrl) {
    const baseUrl = getPythonBaseUrl(pythonApiUrl);
    if (!baseUrl) return;
    try {
        await axios.get(baseUrl, { timeout: PYTHON_TIMEOUT_MS });
    } catch {
        // Render free tier cold start — wake ping can fail before app is ready
    }
}

async function callPythonApi(pythonApiUrl, payload, secretKey) {
    let lastError;

    for (let attempt = 1; attempt <= MAX_PYTHON_RETRIES; attempt++) {
        try {
            if (attempt === 1) {
                await wakePythonBackend(pythonApiUrl);
            }

            return await axios.post(pythonApiUrl, payload, {
                headers: { 'x-internal-secret': secretKey },
                timeout: PYTHON_TIMEOUT_MS,
            });
        } catch (error) {
            lastError = error;
            const status = error.response?.status;
            const retryable = !status || [502, 503, 504].includes(status);

            if (attempt < MAX_PYTHON_RETRIES && retryable) {
                console.warn(`Python retry ${attempt}/${MAX_PYTHON_RETRIES} (status: ${status || 'network'})`);
                await sleep(20000 * attempt);
                continue;
            }

            throw error;
        }
    }

    throw lastError;
}

router.post('/WebsiteDataFetcherApiByHuzaifa', async (req, res) => {
    try {
        const { url, compid, company_id, force } = req.body;
        const companyId = compid || company_id;

        if (!url || !companyId) {
            return res.status(400).json({ success: false, error: "url aur compid (ya company_id) required hain!" });
        }

        if (req.user.role === 'Company' && req.user.companyId !== companyId) {
            return res.status(403).json({ success: false, error: "compid aapke account se match nahi karti" });
        }

        const pythonApiUrl = process.env.PYTHON_API_URL;
        if (!pythonApiUrl) {
            return res.status(500).json({
                success: false,
                error: "Server config missing: PYTHON_API_URL env variable set karo (Render dashboard / .env).",
            });
        }

        const response = await callPythonApi(
            pythonApiUrl,
            {
                url,
                company_id: companyId,
                user_id: req.user.id || req.user.email,
                force: Boolean(force),
            },
            process.env.INTERNAL_SECRET_KEY,
        );

        // Python se jo scraped response milega, woh wapas frontend/Postman ko de do
        return res.status(200).json(response.data);

    } catch (error) {
        console.error("❌ Node Proxy Error:", error.message);
        const { status, body } = formatProxyError(error);
        return res.status(status).json(body);
    }
});

router.post('/UploadPdfByHuzaifa', upload.single('file'), async (req, res) => {
    try {
        const { compid, userid } = req.body;
        const file = req.file;

        if (!file || !compid || !userid) {
            return res.status(400).json({
                success: false,
                error: 'file, compid aur userid required hain!',
            });
        }

        if (req.user.role === 'Company' && req.user.companyId !== compid) {
            return res.status(403).json({
                success: false,
                error: 'compid aapke account se match nahi karti',
            });
        }

        const pythonPdfUrl = getPythonPdfUploadUrl();
        const secretKey = process.env.INTERNAL_SECRET_KEY;

        if (!pythonPdfUrl) {
            return res.status(500).json({
                success: false,
                error: 'Server config missing: PYTHON_API_URL env variable set karo (Render dashboard / .env).',
            });
        }

        if (!secretKey) {
            return res.status(500).json({
                success: false,
                error: 'Server config missing: INTERNAL_SECRET_KEY env variable set karo.',
            });
        }

        await wakePythonBackend(process.env.PYTHON_API_URL);

        const form = new FormData();
        form.append('file', file.buffer, {
            filename: file.originalname,
            contentType: file.mimetype || 'application/pdf',
        });
        form.append('compid', compid);
        form.append('userid', userid);

        const response = await axios.post(pythonPdfUrl, form, {
            headers: {
                ...form.getHeaders(),
                'x-internal-secret': secretKey,
            },
            timeout: PYTHON_TIMEOUT_MS,
            maxBodyLength: Infinity,
            maxContentLength: Infinity,
        });

        return res.status(200).json(response.data);
    } catch (error) {
        console.error('❌ Node PDF Proxy Error:', error.message);
        const { status, body } = formatProxyError(error, 'PDF upload failed.');
        return res.status(status).json(body);
    }
});

module.exports = router;