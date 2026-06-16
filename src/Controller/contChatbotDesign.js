const prisma = require('../Config/db');

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
            return res.status(404).json({ message: 'Chatbot design not found for this company' });
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

module.exports = {
    getChatbotDesign,
    getPublicChatbotDesign,
    upsertChatbotDesign,
    deleteChatbotDesign,
};
