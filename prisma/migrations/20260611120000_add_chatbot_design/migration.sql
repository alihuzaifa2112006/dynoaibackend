-- CreateTable
CREATE TABLE "ChatbotDesign" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "botName" TEXT NOT NULL DEFAULT 'DynoQuery Assistant',
    "welcomeMessage" TEXT NOT NULL DEFAULT 'Hello! How can I help you today?',
    "avatarDataUrl" TEXT,
    "position" TEXT NOT NULL DEFAULT 'bottom-right',
    "bubbleRadius" INTEGER NOT NULL DEFAULT 14,
    "fontHeader" TEXT NOT NULL DEFAULT 'inter',
    "fontIncoming" TEXT NOT NULL DEFAULT 'inter',
    "fontOutgoing" TEXT NOT NULL DEFAULT 'inter',
    "fontInput" TEXT NOT NULL DEFAULT 'inter',
    "headerBg" TEXT NOT NULL DEFAULT '#171717',
    "headerText" TEXT NOT NULL DEFAULT '#ffffff',
    "panelBg" TEXT NOT NULL DEFAULT '#ffffff',
    "incomingBg" TEXT NOT NULL DEFAULT '#f1f5f9',
    "incomingText" TEXT NOT NULL DEFAULT '#334155',
    "outgoingBg" TEXT NOT NULL DEFAULT '#171717',
    "outgoingText" TEXT NOT NULL DEFAULT '#ffffff',
    "inputAreaBg" TEXT NOT NULL DEFAULT '#f8fafc',
    "inputBg" TEXT NOT NULL DEFAULT '#ffffff',
    "inputText" TEXT NOT NULL DEFAULT '#0f172a',
    "sendButtonBg" TEXT NOT NULL DEFAULT '#171717',
    "sendButtonText" TEXT NOT NULL DEFAULT '#ffffff',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatbotDesign_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChatbotDesign_companyId_key" ON "ChatbotDesign"("companyId");
