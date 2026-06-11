// backend/src/Routes/scraper.routes.js
const express = require('express');
const router = express.Router();
const axios = require('axios');

// 🚀 Yeh aapka Node.js (Port 5000) ka main API endpoint hai
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

        const response = await axios.post(process.env.PYTHON_API_URL, {
            url,
            company_id: companyId,
            user_id: req.user.id || req.user.email,
            force: Boolean(force),
        }, {
            headers: {
                'x-internal-secret': process.env.INTERNAL_SECRET_KEY
            },
            timeout: 120000
        });

        // Python se jo scraped response milega, woh wapas frontend/Postman ko de do
        return res.status(200).json(response.data);

    } catch (error) {
        console.error("❌ Node Proxy Error:", error.message);
        if (error.response) {
            const data = error.response.data;
            const message = data?.detail || data?.error || data?.message || "Python API error";
            return res.status(error.response.status).json({ success: false, error: message });
        }
        return res.status(503).json({
            success: false,
            error: `Python backend unreachable. Port 8000 par uvicorn chalao. (${error.message})`
        });
    }
});

module.exports = router;