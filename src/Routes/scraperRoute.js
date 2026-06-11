// backend/src/Routes/scraper.routes.js
const express = require('express');
const router = express.Router();
const axios = require('axios');

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
        if (error.response) {
            const data = error.response.data;
            const status = error.response.status;

            if ([502, 503, 504].includes(status)) {
                return res.status(status).json({
                    success: false,
                    error: "Python backend abhi wake up ho raha hai (Render free tier). 1-2 minute wait karke dubara try karo.",
                });
            }

            const message = data?.detail || data?.error || data?.message || "Python API error";
            return res.status(status).json({ success: false, error: message });
        }

        return res.status(503).json({
            success: false,
            error: `Python backend unreachable. PYTHON_API_URL aur INTERNAL_SECRET_KEY Render par check karo. (${error.message || "connection failed"})`,
        });
    }
});

module.exports = router;