const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/middlewar');
const {
    getChatbotDesign,
    getPublicChatbotDesign,
    upsertChatbotDesign,
    deleteChatbotDesign,
} = require('../Controller/contChatbotDesign');

router.get('/public/:companyId', getPublicChatbotDesign);

router.get('/:companyId', protect, getChatbotDesign);
router.put('/:companyId', protect, upsertChatbotDesign);
router.delete('/:companyId', protect, deleteChatbotDesign);

module.exports = router;
