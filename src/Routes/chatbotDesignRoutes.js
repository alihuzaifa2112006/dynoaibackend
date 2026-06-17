const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/middlewar');
const {
    getChatbotDesign,
    getPublicChatbotDesign,
    upsertChatbotDesign,
    deleteChatbotDesign,
    askChatbotQuestion,
} = require('../Controller/contChatbotDesign');

router.get('/public/:companyId', getPublicChatbotDesign);
router.post('/public/question', askChatbotQuestion);

router.get('/:companyId', protect, getChatbotDesign);
router.post('/:companyId', protect, upsertChatbotDesign);
router.put('/:companyId', protect, upsertChatbotDesign);
router.delete('/:companyId', protect, deleteChatbotDesign);

module.exports = router;
