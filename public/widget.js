(function() {
    // 1. Locate current script and extract company ID
    const scriptTag = document.currentScript || (() => {
        const scripts = document.getElementsByTagName('script');
        for (let i = scripts.length - 1; i >= 0; i--) {
            if (scripts[i].src.includes('widget.js') && scripts[i].getAttribute('data-company-id')) {
                return scripts[i];
            }
        }
        return null;
    })();

    if (!scriptTag) {
        console.error("DynoQuery Widget: Script tag execution not resolved.");
        return;
    }

    const companyId = scriptTag.getAttribute('data-company-id');
    if (!companyId) {
        console.error("DynoQuery Widget: 'data-company-id' attribute is required to initialize the chatbot.");
        return;
    }

    // 2. Resolve Backend Base URL
    const backendUrl = new URL(scriptTag.src).origin;

    // 3. Fetch public design configuration
    fetch(`${backendUrl}/api/chatbot-design/public/${encodeURIComponent(companyId)}`)
        .then(response => {
            if (!response.ok) {
                throw new Error("Chatbot design not found for company: " + companyId);
            }
            return response.json();
        })
        .then(data => {
            if (!data.design) {
                throw new Error("Invalid design data received.");
            }
            initializeWidget(data.design, backendUrl, companyId);
        })
        .catch(error => {
            console.error("DynoQuery Widget Load Error:", error.message);
        });

    // 4. Initialize and build the floating widget UI
    function initializeWidget(design, baseApiUrl, compId) {
        // Map widget position styles
        const pos = design.position || 'bottom-right';
        const isRight = pos.includes('right');
        const isBottom = pos.includes('bottom');

        const cssVariables = `
            :root {
                --dq-header-bg: ${design.headerBg || '#171717'};
                --dq-header-text: ${design.headerText || '#ffffff'};
                --dq-panel-bg: ${design.panelBg || '#ffffff'};
                --dq-incoming-bg: ${design.incomingBg || '#f1f5f9'};
                --dq-incoming-text: ${design.incomingText || '#334155'};
                --dq-outgoing-bg: ${design.outgoingBg || '#171717'};
                --dq-outgoing-text: ${design.outgoingText || '#ffffff'};
                --dq-input-area-bg: ${design.inputAreaBg || '#f8fafc'};
                --dq-input-bg: ${design.inputBg || '#ffffff'};
                --dq-input-text: ${design.inputText || '#0f172a'};
                --dq-send-bg: ${design.sendButtonBg || '#171717'};
                --dq-send-text: ${design.sendButtonText || '#ffffff'};
                --dq-radius: ${design.bubbleRadius !== undefined ? design.bubbleRadius : 14}px;
                --dq-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            }
        `;

        const styleTag = document.createElement('style');
        styleTag.innerHTML = cssVariables + `
            .dq-widget-container {
                position: fixed;
                z-index: 999999;
                font-family: var(--dq-font);
                display: flex;
                flex-direction: column;
                box-sizing: border-box;
                ${isBottom ? 'bottom: 20px;' : 'top: 20px;'}
                ${isRight ? 'right: 20px;' : 'left: 20px;'}
            }
            
            /* Launcher Button */
            .dq-launcher {
                width: 60px;
                height: 60px;
                border-radius: 50%;
                background-color: var(--dq-header-bg);
                color: var(--dq-header-text);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: transform 0.2s ease, opacity 0.2s ease;
                border: none;
                outline: none;
                margin-top: 10px;
                margin-bottom: 10px;
                align-self: ${isRight ? 'flex-end' : 'flex-start'};
            }
            
            .dq-launcher:hover {
                transform: scale(1.05);
            }
            
            .dq-launcher svg {
                width: 28px;
                height: 28px;
                fill: currentColor;
                transition: transform 0.3s ease;
            }
            
            /* Chat Box Panel */
            .dq-chatbox {
                width: 370px;
                height: 520px;
                max-height: calc(100vh - 120px);
                background-color: var(--dq-panel-bg);
                border-radius: 16px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
                display: none;
                flex-direction: column;
                overflow: hidden;
                border: 1px solid rgba(0, 0, 0, 0.08);
                transition: opacity 0.25s ease, transform 0.25s ease;
                transform: translateY(10px);
                opacity: 0;
            }
            
            .dq-chatbox.dq-open {
                display: flex;
                transform: translateY(0);
                opacity: 1;
            }
            
            /* Header */
            .dq-header {
                background-color: var(--dq-header-bg);
                color: var(--dq-header-text);
                padding: 16px;
                display: flex;
                align-items: center;
                box-sizing: border-box;
            }
            
            .dq-avatar-container {
                width: 36px;
                height: 36px;
                border-radius: 50%;
                overflow: hidden;
                margin-right: 12px;
                background-color: rgba(255, 255, 255, 0.15);
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }
            
            .dq-avatar-img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }
            
            .dq-header-info {
                flex: 1;
                min-width: 0;
            }
            
            .dq-bot-name {
                font-weight: 600;
                font-size: 15px;
                display: block;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                margin-bottom: 2px;
            }
            
            .dq-status-indicator {
                font-size: 11px;
                opacity: 0.85;
                display: flex;
                align-items: center;
            }
            
            .dq-status-dot {
                width: 7px;
                height: 7px;
                background-color: #10b981;
                border-radius: 50%;
                margin-right: 5px;
                display: inline-block;
            }
            
            .dq-close-btn {
                background: none;
                border: none;
                color: inherit;
                cursor: pointer;
                padding: 4px;
                opacity: 0.75;
                transition: opacity 0.15s;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .dq-close-btn:hover {
                opacity: 1;
            }
            
            /* Messages Area */
            .dq-messages {
                flex: 1;
                overflow-y: auto;
                padding: 16px;
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
                gap: 12px;
                background-color: var(--dq-panel-bg);
            }
            
            .dq-msg-row {
                display: flex;
                width: 100%;
            }
            
            .dq-msg-bot {
                justify-content: flex-start;
            }
            
            .dq-msg-user {
                justify-content: flex-end;
            }
            
            .dq-bubble {
                max-width: 80%;
                padding: 10px 14px;
                font-size: 14px;
                line-height: 1.45;
                box-sizing: border-box;
                word-wrap: break-word;
            }
            
            .dq-bubble-bot {
                background-color: var(--dq-incoming-bg);
                color: var(--dq-incoming-text);
                border-radius: var(--dq-radius) var(--dq-radius) var(--dq-radius) 4px;
            }
            
            .dq-bubble-user {
                background-color: var(--dq-outgoing-bg);
                color: var(--dq-outgoing-text);
                border-radius: var(--dq-radius) var(--dq-radius) 4px var(--dq-radius);
            }
            
            .dq-bubble-error {
                background-color: rgba(239, 68, 68, 0.15);
                color: #ef4444;
                border-radius: var(--dq-radius);
                border: 1px solid rgba(239, 68, 68, 0.2);
            }
            
            /* Typing Indicator */
            .dq-typing-bubble {
                display: flex;
                gap: 4px;
                padding: 12px 16px;
                background-color: var(--dq-incoming-bg);
                border-radius: var(--dq-radius);
                align-self: flex-start;
                align-items: center;
                box-sizing: border-box;
            }
            
            .dq-typing-dot {
                width: 6px;
                height: 6px;
                background-color: var(--dq-incoming-text);
                opacity: 0.4;
                border-radius: 50%;
                animation: dq-typing 1.4s infinite both;
            }
            
            .dq-typing-dot:nth-child(2) { animation-delay: 0.2s; }
            .dq-typing-dot:nth-child(3) { animation-delay: 0.4s; }
            
            @keyframes dq-typing {
                0%, 100% { transform: translateY(0); opacity: 0.4; }
                50% { transform: translateY(-4px); opacity: 1; }
            }
            
            /* Input Footer Area */
            .dq-input-area {
                background-color: var(--dq-input-area-bg);
                padding: 12px;
                display: flex;
                gap: 8px;
                align-items: center;
                box-sizing: border-box;
                border-top: 1px solid rgba(0, 0, 0, 0.05);
            }
            
            .dq-input-field {
                flex: 1;
                background-color: var(--dq-input-bg);
                color: var(--dq-input-text);
                border: 1px solid rgba(0, 0, 0, 0.08);
                border-radius: 20px;
                padding: 8px 16px;
                font-size: 14px;
                outline: none;
                box-sizing: border-box;
                transition: border-color 0.15s;
            }
            
            .dq-input-field:focus {
                border-color: var(--dq-header-bg);
            }
            
            .dq-send-btn {
                width: 34px;
                height: 34px;
                border-radius: 50%;
                background-color: var(--dq-send-bg);
                color: var(--dq-send-text);
                border: none;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                outline: none;
                flex-shrink: 0;
                padding: 0;
            }
            
            .dq-send-btn:hover {
                transform: scale(1.05);
            }
            
            .dq-send-btn svg {
                width: 16px;
                height: 16px;
                fill: currentColor;
            }
            
            .dq-branding {
                text-align: center;
                font-size: 10px;
                color: #94a3b8;
                padding: 4px 0 8px 0;
                background-color: var(--dq-input-area-bg);
                letter-spacing: 0.03em;
            }
            
            .dq-branding a {
                color: inherit;
                text-decoration: none;
                font-weight: 600;
            }

            @media (max-width: 450px) {
                .dq-chatbox {
                    width: calc(100vw - 40px);
                    height: calc(100vh - 140px);
                }
            }
        `;

        document.head.appendChild(styleTag);

        // Build HTML
        const container = document.createElement('div');
        container.className = 'dq-widget-container';

        // Avatar template
        const avatarHtml = design.avatarDataUrl 
            ? `<img src="${design.avatarDataUrl}" alt="" class="dq-avatar-img" />`
            : `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`;

        container.innerHTML = `
            <div class="dq-chatbox" id="dq-chatbox">
                <div class="dq-header">
                    <div class="dq-avatar-container">${avatarHtml}</div>
                    <div class="dq-header-info">
                        <span class="dq-bot-name">${design.botName || 'Assistant'}</span>
                        <div class="dq-status-indicator">
                            <span class="dq-status-dot"></span> Online
                        </div>
                    </div>
                    <button class="dq-close-btn" id="dq-close-btn" aria-label="Close chat">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
                <div class="dq-messages" id="dq-messages">
                    <div class="dq-msg-row dq-msg-bot">
                        <div class="dq-bubble dq-bubble-bot">${design.welcomeMessage || 'Hello! How can I help you today?'}</div>
                    </div>
                </div>
                <div class="dq-input-area">
                    <input type="text" class="dq-input-field" id="dq-input-field" placeholder="Type a message..." autocomplete="off" />
                    <button class="dq-send-btn" id="dq-send-btn" aria-label="Send">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                    </button>
                </div>
                <div class="dq-branding">
                    Powered by <a href="http://localhost:3000" target="_blank" rel="noopener noreferrer">DynoQuery</a>
                </div>
            </div>
            <button class="dq-launcher" id="dq-launcher" aria-label="Open chat">
                <svg id="dq-icon-chat" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                <svg id="dq-icon-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: none;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
        `;

        document.body.appendChild(container);

        // Elements
        const launcher = container.querySelector('#dq-launcher');
        const chatbox = container.querySelector('#dq-chatbox');
        const closeBtn = container.querySelector('#dq-close-btn');
        const iconChat = container.querySelector('#dq-icon-chat');
        const iconClose = container.querySelector('#dq-icon-close');
        const messages = container.querySelector('#dq-messages');
        const inputField = container.querySelector('#dq-input-field');
        const sendBtn = container.querySelector('#dq-send-btn');

        // Toggle state
        let isOpen = false;

        function toggleChat() {
            isOpen = !isOpen;
            if (isOpen) {
                chatbox.classList.add('dq-open');
                iconChat.style.display = 'none';
                iconClose.style.display = 'block';
                inputField.focus();
            } else {
                chatbox.classList.remove('dq-open');
                iconChat.style.display = 'block';
                iconClose.style.display = 'none';
            }
        }

        launcher.addEventListener('click', toggleChat);
        closeBtn.addEventListener('click', toggleChat);

        // Send Message Handler
        function handleSend() {
            const text = inputField.value.trim();
            if (!text) return;

            inputField.value = '';

            // Render outgoing message
            const userRow = document.createElement('div');
            userRow.className = 'dq-msg-row dq-msg-user';
            userRow.innerHTML = `<div class="dq-bubble dq-bubble-user">${escapeHtml(text)}</div>`;
            messages.appendChild(userRow);
            scrollToBottom();

            // Render typing indicator
            const typingRow = document.createElement('div');
            typingRow.className = 'dq-msg-row dq-msg-bot';
            typingRow.id = 'dq-typing-row';
            typingRow.innerHTML = `
                <div class="dq-typing-bubble">
                    <span class="dq-typing-dot"></span>
                    <span class="dq-typing-dot"></span>
                    <span class="dq-typing-dot"></span>
                </div>
            `;
            messages.appendChild(typingRow);
            scrollToBottom();

            // Call backend proxy API
            fetch(`${baseApiUrl}/api/chatbot-design/public/question`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ companyId: compId, message: text })
            })
            .then(res => {
                if (!res.ok) {
                    return res.json().then(d => { throw new Error(d.detail || d.message || "Failed request") });
                }
                return res.json();
            })
            .then(data => {
                removeTyping();
                if (data.success && data.reply) {
                    renderBotResponse(data.reply);
                } else {
                    renderBotError("Oops! Something went wrong generating a response.");
                }
            })
            .catch(err => {
                removeTyping();
                renderBotError(err.message || "Connection to chat server failed. Check your network.");
            });
        }

        function removeTyping() {
            const typing = container.querySelector('#dq-typing-row');
            if (typing) typing.remove();
        }

        function renderBotResponse(reply) {
            const botRow = document.createElement('div');
            botRow.className = 'dq-msg-row dq-msg-bot';
            botRow.innerHTML = `<div class="dq-bubble dq-bubble-bot">${escapeHtml(reply)}</div>`;
            messages.appendChild(botRow);
            scrollToBottom();
        }

        function renderBotError(errorText) {
            const botRow = document.createElement('div');
            botRow.className = 'dq-msg-row dq-msg-bot';
            botRow.innerHTML = `<div class="dq-bubble dq-bubble-error">${escapeHtml(errorText)}</div>`;
            messages.appendChild(botRow);
            scrollToBottom();
        }

        function scrollToBottom() {
            messages.scrollTop = messages.scrollHeight;
        }

        function escapeHtml(string) {
            const map = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            };
            return String(string).replace(/[&<>"']/g, function(m) { return map[m]; });
        }

        // Attach inputs
        sendBtn.addEventListener('click', handleSend);
        inputField.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleSend();
            }
        });
    }
})();
