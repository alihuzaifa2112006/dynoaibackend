const prisma = require('../Config/db');
const axios = require('axios');

const designSelect = {
    id: true,
    companyId: true,
    botName: true,
    welcomeMessage: true,
    avatarDataUrl: true,
    position: true,
    bubbleRadius: true,
    fontHeader: true,
    fontIncoming: true,
    fontOutgoing: true,
    fontInput: true,
    headerBg: true,
    headerText: true,
    panelBg: true,
    incomingBg: true,
    incomingText: true,
    outgoingBg: true,
    outgoingText: true,
    inputAreaBg: true,
    inputBg: true,
    inputText: true,
    sendButtonBg: true,
    sendButtonText: true,
    createdAt: true,
    updatedAt: true,
};

const updatableFields = [
    'botName',
    'welcomeMessage',
    'avatarDataUrl',
    'position',
    'bubbleRadius',
    'fontHeader',
    'fontIncoming',
    'fontOutgoing',
    'fontInput',
    'headerBg',
    'headerText',
    'panelBg',
    'incomingBg',
    'incomingText',
    'outgoingBg',
    'outgoingText',
    'inputAreaBg',
    'inputBg',
    'inputText',
    'sendButtonBg',
    'sendButtonText',
];

const assertCompanyAccess = (req, res, companyId) => {
    if (req.user.role === 'Admin') return true;
    if (req.user.role === 'Company' && req.user.companyId === companyId) return true;
    res.status(403).json({ message: 'Not authorized to access this chatbot design' });
    return false;
};

const buildDesignData = (body) => {
    const data = {};
    for (const field of updatableFields) {
        if (body[field] !== undefined) {
            data[field] = body[field];
        }
    }
    return data;
};

const getChatbotDesign = async (req, res) => {
    try {
        const { companyId } = req.params;

        if (!companyId) {
            return res.status(400).json({ message: 'companyId is required' });
        }

        if (!assertCompanyAccess(req, res, companyId)) return;

        const design = await prisma.chatbotDesign.findUnique({
            where: { companyId },
            select: designSelect,
        });

        if (!design) {
            return res.status(404).json({ message: 'Chatbot design not found for this company' });
        }

        res.status(200).json({
            message: 'Chatbot design fetched successfully',
            design,
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

const getPublicChatbotDesign = async (req, res) => {
    try {
        const { companyId } = req.params;

        if (!companyId) {
            return res.status(400).json({ message: 'companyId is required' });
        }

        const design = await prisma.chatbotDesign.findUnique({
            where: { companyId },
            select: designSelect,
        });

        if (!design) {
            return res.status(200).json({ 
                design: {
                    botName: "Assistant",
                    welcomeMessage: "Hello! How can I help you today?",
                    position: "bottom-right",
                    bubbleRadius: 14,
                    headerBg: "#171717",
                    headerText: "#ffffff",
                    panelBg: "#ffffff",
                    incomingBg: "#f1f5f9",
                    incomingText: "#334155",
                    outgoingBg: "#171717",
                    outgoingText: "#ffffff",
                    inputAreaBg: "#f8fafc",
                    inputBg: "#ffffff",
                    inputText: "#0f172a",
                    sendButtonBg: "#171717",
                    sendButtonText: "#ffffff"
                } 
            });
        }

        res.status(200).json({ design });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

const upsertChatbotDesign = async (req, res) => {
    try {
        const { companyId } = req.params;
        const data = buildDesignData(req.body);

        if (!companyId) {
            return res.status(400).json({ message: 'companyId is required' });
        }

        if (!assertCompanyAccess(req, res, companyId)) return;

        if (data.bubbleRadius !== undefined) {
            const radius = Number(data.bubbleRadius);
            if (!Number.isInteger(radius) || radius < 0) {
                return res.status(400).json({ message: 'bubbleRadius must be a non-negative integer' });
            }
            data.bubbleRadius = radius;
        }

        const companyExists = await prisma.user.findUnique({
            where: { CompId: companyId },
            select: { CompId: true },
        });

        if (!companyExists) {
            return res.status(404).json({ message: 'Company not found' });
        }

        const design = await prisma.chatbotDesign.upsert({
            where: { companyId },
            create: { companyId, ...data },
            update: data,
            select: designSelect,
        });

        res.status(200).json({
            message: 'Chatbot design saved successfully',
            design,
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

const deleteChatbotDesign = async (req, res) => {
    try {
        const { companyId } = req.params;

        if (!companyId) {
            return res.status(400).json({ message: 'companyId is required' });
        }

        if (!assertCompanyAccess(req, res, companyId)) return;

        const existing = await prisma.chatbotDesign.findUnique({
            where: { companyId },
            select: { id: true },
        });

        if (!existing) {
            return res.status(404).json({ message: 'Chatbot design not found for this company' });
        }

        await prisma.chatbotDesign.delete({ where: { companyId } });

        res.status(200).json({ message: 'Chatbot design deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

const askChatbotQuestion = async (req, res) => {
    try {
        const { companyId, message } = req.body;
        if (!companyId || !message) {
            return res.status(400).json({ success: false, message: "companyId and message are required" });
        }

        // Verify that the company exists in the database
        const companyExists = await prisma.user.findUnique({
            where: { CompId: companyId },
            select: { CompId: true }
        });

        if (!companyExists) {
            return res.status(404).json({ success: false, message: `Company ID '${companyId}' is not registered.` });
        }

        const pythonBaseUrl = process.env.PYTHON_API_URL 
            ? new URL(process.env.PYTHON_API_URL).origin 
            : "http://localhost:8000";
        const pythonUrl = `${pythonBaseUrl}/api/question`;

        const response = await axios.post(pythonUrl, {
            companyId,
            message
        });

        return res.status(200).json(response.data);
    } catch (error) {
        console.error("❌ Widget Question Proxy Error:", error.message);
        const detail = error.response?.data?.detail || error.response?.data?.message || error.message;
        return res.status(error.response?.status || 500).json({ success: false, message: "Error from Chatbot Engine", detail });
    }
};

module.exports = {
    getChatbotDesign,
    getPublicChatbotDesign,
    upsertChatbotDesign,
    deleteChatbotDesign,
    askChatbotQuestion,
};
