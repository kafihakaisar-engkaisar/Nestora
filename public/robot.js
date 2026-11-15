/**
 * Nestora AI Robot - Smart PG Assistant
 * Complete floating assistant with multi-lingual NLP, verified database retrieval,
 * role awareness (Tenant/Owner/Guest), voice chat, and action confirmations.
 */

(function () {
    "use strict";

    const API_URL = (typeof window !== "undefined" && (window.location.protocol === "file:" || window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"))
        ? "http://127.0.0.1:8000"
        : "";

    // Detect role and auth state
    function getAuthContext() {
        let token = null;
        let role = "guest";
        let user = null;

        const path = window.location.pathname.toLowerCase();

        // Check Tenant session
        const tenantUser = localStorage.getItem("nestora_tenant_user");
        const tenantToken = localStorage.getItem("nestora_tenant_token");

        // Check Owner session
        const ownerUser = localStorage.getItem("nestora_owner_user");
        const ownerToken = localStorage.getItem("nestora_owner_token");

        // Check generic session
        const genericUser = localStorage.getItem("nestora_user");
        const genericToken = localStorage.getItem("nestora_token");

        if (path.includes("tenant.html") && tenantUser && tenantToken) {
            role = "tenant";
            token = tenantToken;
            try { user = JSON.parse(tenantUser); } catch (e) {}
        } else if (path.includes("owner.html") && ownerUser && ownerToken) {
            role = "owner";
            token = ownerToken;
            try { user = JSON.parse(ownerUser); } catch (e) {}
        } else if (tenantToken && tenantUser) {
            role = "tenant";
            token = tenantToken;
            try { user = JSON.parse(tenantUser); } catch (e) {}
        } else if (ownerToken && ownerUser) {
            role = "owner";
            token = ownerToken;
            try { user = JSON.parse(ownerUser); } catch (e) {}
        } else if (genericToken && genericUser) {
            try {
                user = JSON.parse(genericUser);
                role = (user && user.role) ? user.role : "guest";
                token = genericToken;
            } catch (e) {}
        }

        return { role, token, user };
    }

    // Role-specific quick suggested questions
    const SUGGESTIONS = {
        tenant: [
            "🔍 Find a PG",
            "📋 Mera PG request status",
            "💳 Mera rent kitna hai?",
            "🧾 Last payment receipt",
            "🛠️ Complaint kaise karein?"
        ],
        owner: [
            "🏢 Mere kitne PG registered hain?",
            "📋 Kitne tenant requests pending hain?",
            "🛏️ Available beds kitne hain?",
            "💰 Payment status",
            "➕ Naya PG kaise add karun?"
        ],
        guest: [
            "🔍 Sakchi mein girls PG",
            "🔍 Boys PG under ₹6,000",
            "📍 Bistupur single room PGs",
            "ℹ️ Nestora kaise use karein?"
        ]
    };

    // State
    let isWidgetOpen = false;
    let isMinimized = false;
    let isSpeechEnabled = false;
    let isListening = false;
    let recognition = null;
    let messageHistory = [];

    // Initialize Widget DOM
    function initRobotWidget() {
        if (document.getElementById("nestoraRobotContainer")) return;

        const auth = getAuthContext();
        const role = auth.role;
        const userName = auth.user ? auth.user.name.split(" ")[0] : (role === "owner" ? "Owner" : (role === "tenant" ? "Tenant" : "Friend"));

        const container = document.createElement("div");
        container.id = "nestoraRobotContainer";
        container.className = "nestora-robot-root";

        container.innerHTML = `
            <!-- Floating Robot Trigger Button -->
            <button id="nestoraRobotTrigger" class="nestora-robot-trigger" type="button" aria-label="Open Nestora AI Assistant">
                <span class="robot-pulse-ring"></span>
                <div class="robot-badge-status" title="Nestora AI Online"></div>
                <div class="robot-avatar-graphic">
                    <svg viewBox="0 0 64 64" fill="none" class="robot-svg">
                        <!-- Head -->
                        <rect x="12" y="18" width="40" height="34" rx="14" fill="url(#robotGrad)" stroke="#38BDF8" stroke-width="2.2"/>
                        <!-- Antenna -->
                        <line x1="32" y1="18" x2="32" y2="8" stroke="#38BDF8" stroke-width="2.5" stroke-linecap="round"/>
                        <circle cx="32" cy="7" r="4.5" fill="#38BDF8" class="antenna-glow"/>
                        <!-- Ears -->
                        <rect x="6" y="29" width="6" height="12" rx="3" fill="#0F766E"/>
                        <rect x="52" y="29" width="6" height="12" rx="3" fill="#0F766E"/>
                        <!-- Eyes Visor -->
                        <rect x="18" y="26" width="28" height="12" rx="6" fill="#0F172A"/>
                        <circle cx="26" cy="32" r="3.2" fill="#38BDF8" class="robot-eye robot-eye-left"/>
                        <circle cx="38" cy="32" r="3.2" fill="#38BDF8" class="robot-eye robot-eye-right"/>
                        <!-- Smile -->
                        <path d="M26 44 C28 47, 36 47, 38 44" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round"/>
                        <!-- Gradient definitions -->
                        <defs>
                            <linearGradient id="robotGrad" x1="12" y1="18" x2="52" y2="52" gradientUnits="userSpaceOnUse">
                                <stop stop-color="#2563EB"/>
                                <stop offset="1" stop-color="#0F766E"/>
                            </linearGradient>
                        </defs>
                    </svg>
                </div>
            </button>

            <!-- Floating Greeting Tooltip Bubble -->
            <div id="robotTooltipBubble" class="robot-tooltip-bubble">
                <span>👋 Hi ${userName}! Need help finding a PG or checking dues?</span>
                <button type="button" id="closeTooltipBtn" class="close-tooltip-btn" aria-label="Dismiss greeting">✕</button>
            </div>

            <!-- Chat Window Panel -->
            <div id="nestoraChatWidget" class="nestora-chat-widget" role="dialog" aria-modal="true" aria-labelledby="chatHeaderTitle">
                <!-- Chat Header -->
                <div class="chat-header">
                    <div class="header-left">
                        <div class="header-robot-icon">
                            <span class="header-status-dot"></span>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2">
                                <rect x="3" y="11" width="18" height="10" rx="4"/>
                                <circle cx="8" cy="15" r="1.5" fill="#38BDF8"/>
                                <circle cx="16" cy="15" r="1.5" fill="#38BDF8"/>
                                <path d="M12 3v4"/>
                                <circle cx="12" cy="3" r="1.5" fill="#38BDF8"/>
                            </svg>
                        </div>
                        <div class="header-info">
                            <h2 id="chatHeaderTitle" class="header-title">Nestora AI</h2>
                            <span class="header-subtitle">
                                <span class="role-pill">${role.toUpperCase()}</span> • Smart PG Assistant
                            </span>
                        </div>
                    </div>
                    <div class="header-actions">
                        <button id="toggleSpeechBtn" class="header-btn" title="Toggle Spoken Responses" type="button" aria-label="Toggle Speech">
                            <svg id="speechIconMuted" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                                <line x1="23" y1="9" x2="17" y2="15"/>
                                <line x1="17" y1="9" x2="23" y2="15"/>
                            </svg>
                            <svg id="speechIconActive" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" stroke-width="2" style="display:none;">
                                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
                            </svg>
                        </button>
                        <button id="clearChatBtn" class="header-btn" title="Clear Chat History" type="button" aria-label="Clear Chat History">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            </svg>
                        </button>
                        <button id="minimizeChatBtn" class="header-btn" title="Minimize Window" type="button" aria-label="Minimize Chat Window">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                                <line x1="5" y1="12" x2="19" y2="12"/>
                            </svg>
                        </button>
                        <button id="closeChatBtn" class="header-btn" title="Close Window" type="button" aria-label="Close Chat Window">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                        </button>
                    </div>
                </div>

                <!-- Chat Body / Messages Scroll Area -->
                <div id="chatMessages" class="chat-messages" role="log" aria-live="polite">
                    <!-- Welcome Initial Message -->
                    <div class="message-bubble bot-message intro-message">
                        <div class="bot-bubble-avatar">🤖</div>
                        <div class="message-content">
                            <p><strong>Namaste ${userName}!</strong> I am your Nestora Smart AI Assistant. Ask me anything about PG listings, room requests, rent payments, or house rules in <strong>English, Hindi, or Hinglish</strong>.</p>
                            <span class="message-time">Just now</span>
                        </div>
                    </div>

                    <!-- Suggested Questions Strip -->
                    <div id="chatSuggestionsList" class="chat-suggestions-container">
                        <span class="suggestions-label">💡 Suggested for you:</span>
                        <div class="suggestions-chips-grid">
                            ${(SUGGESTIONS[role] || SUGGESTIONS.guest).map(s => `<button type="button" class="suggestion-chip">${s}</button>`).join("")}
                        </div>
                    </div>
                </div>

                <!-- Typing / Voice Indicator Bar -->
                <div id="chatTypingIndicator" class="chat-typing-indicator" style="display: none;">
                    <div class="typing-bubble">
                        <span class="typing-dot"></span>
                        <span class="typing-dot"></span>
                        <span class="typing-dot"></span>
                    </div>
                    <span id="typingIndicatorLabel" class="typing-label">Nestora AI is thinking...</span>
                </div>

                <!-- Voice Recording Status -->
                <div id="voiceRecordingStatus" class="voice-recording-status" style="display: none;">
                    <span class="recording-pulse"></span>
                    <span>Listening... Speak your question now</span>
                    <button type="button" id="stopRecordingBtn" class="stop-rec-btn">Stop</button>
                </div>

                <!-- Input Footer Area -->
                <form id="chatInputForm" class="chat-input-form">
                    <button type="button" id="voiceMicBtn" class="chat-voice-btn" title="Voice Input (Speech-to-Text)" aria-label="Voice Input">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                            <line x1="12" y1="19" x2="12" y2="23"/>
                            <line x1="8" y1="23" x2="16" y2="23"/>
                        </svg>
                    </button>
                    <input
                        type="text"
                        id="chatTextInput"
                        class="chat-text-input"
                        placeholder="Type a message in Hindi / English..."
                        autocomplete="off"
                        required
                    />
                    <button type="submit" id="chatSendBtn" class="chat-send-btn" title="Send message" aria-label="Send Message">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="22" y1="2" x2="11" y2="13"/>
                            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                        </svg>
                    </button>
                </form>
            </div>
        `;

        document.body.appendChild(container);
        setupEventListeners();

        // Show greeting tooltip for 7 seconds on first load
        setTimeout(() => {
            const tip = document.getElementById("robotTooltipBubble");
            if (tip && !isWidgetOpen) {
                tip.classList.add("visible");
                setTimeout(() => {
                    if (tip) tip.classList.remove("visible");
                }, 7000);
            }
        }, 1200);
    }

    // Attach Event Handlers
    function setupEventListeners() {
        const trigger = document.getElementById("nestoraRobotTrigger");
        const widget = document.getElementById("nestoraChatWidget");
        const closeBtn = document.getElementById("closeChatBtn");
        const minBtn = document.getElementById("minimizeChatBtn");
        const clearBtn = document.getElementById("clearChatBtn");
        const speechBtn = document.getElementById("toggleSpeechBtn");
        const form = document.getElementById("chatInputForm");
        const input = document.getElementById("chatTextInput");
        const voiceBtn = document.getElementById("voiceMicBtn");
        const stopRecBtn = document.getElementById("stopRecordingBtn");
        const closeTipBtn = document.getElementById("closeTooltipBtn");

        // Toggle open/close
        trigger.addEventListener("click", () => {
            toggleChatWidget();
        });

        closeBtn.addEventListener("click", () => {
            closeChatWidget();
        });

        minBtn.addEventListener("click", () => {
            minimizeChatWidget();
        });

        if (closeTipBtn) {
            closeTipBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                const tip = document.getElementById("robotTooltipBubble");
                if (tip) tip.classList.remove("visible");
            });
        }

        clearBtn.addEventListener("click", () => {
            clearChatHistory();
        });

        speechBtn.addEventListener("click", () => {
            toggleSpeech();
        });

        form.addEventListener("submit", (e) => {
            e.preventDefault();
            const text = input.value.trim();
            if (text) {
                handleUserMessage(text);
                input.value = "";
            }
        });

        voiceBtn.addEventListener("click", () => {
            toggleVoiceInput();
        });

        if (stopRecBtn) {
            stopRecBtn.addEventListener("click", () => {
                stopVoiceInput();
            });
        }

        // Delegate suggestion chip clicks
        document.addEventListener("click", (e) => {
            if (e.target.classList.contains("suggestion-chip")) {
                const query = e.target.textContent.replace(/^[^\w\s]+/g, "").trim();
                handleUserMessage(query);
            }

            // Quick navigation links inside bot messages
            if (e.target.dataset.dashboardAction) {
                const action = e.target.dataset.dashboardAction;
                navigateToDashboardSection(action);
            }

            // Action execution buttons (Confirm / Reject)
            if (e.target.dataset.actionType && e.target.dataset.requestId) {
                const actionType = e.target.dataset.actionType;
                const reqId = parseInt(e.target.dataset.requestId, 10);
                executeOwnerAction(actionType, reqId, e.target);
            }
        });
    }

    // Toggle chat widget visibility
    function toggleChatWidget() {
        const widget = document.getElementById("nestoraChatWidget");
        const tip = document.getElementById("robotTooltipBubble");
        if (tip) tip.classList.remove("visible");

        if (isWidgetOpen) {
            closeChatWidget();
        } else {
            isWidgetOpen = true;
            isMinimized = false;
            widget.classList.remove("minimized");
            widget.classList.add("open");
            setTimeout(() => {
                const input = document.getElementById("chatTextInput");
                if (input && window.innerWidth > 640) input.focus();
            }, 300);
        }
    }

    function closeChatWidget() {
        const widget = document.getElementById("nestoraChatWidget");
        isWidgetOpen = false;
        widget.classList.remove("open", "minimized");
        stopVoiceInput();
    }

    function minimizeChatWidget() {
        const widget = document.getElementById("nestoraChatWidget");
        if (isMinimized) {
            isMinimized = false;
            widget.classList.remove("minimized");
        } else {
            isMinimized = true;
            widget.classList.add("minimized");
        }
    }

    function clearChatHistory() {
        const msgs = document.getElementById("chatMessages");
        const auth = getAuthContext();
        const role = auth.role;
        const userName = auth.user ? auth.user.name.split(" ")[0] : "Friend";

        msgs.innerHTML = `
            <div class="message-bubble bot-message intro-message">
                <div class="bot-bubble-avatar">🤖</div>
                <div class="message-content">
                    <p>Chat history cleared. <strong>Namaste ${userName}!</strong> How can I help you right now?</p>
                    <span class="message-time">Just now</span>
                </div>
            </div>
            <div id="chatSuggestionsList" class="chat-suggestions-container">
                <span class="suggestions-label">💡 Suggested questions:</span>
                <div class="suggestions-chips-grid">
                    ${(SUGGESTIONS[role] || SUGGESTIONS.guest).map(s => `<button type="button" class="suggestion-chip">${s}</button>`).join("")}
                </div>
            </div>
        `;
        messageHistory = [];
    }

    // Toggle Text-to-Speech
    function toggleSpeech() {
        isSpeechEnabled = !isSpeechEnabled;
        const muted = document.getElementById("speechIconMuted");
        const active = document.getElementById("speechIconActive");
        if (isSpeechEnabled) {
            muted.style.display = "none";
            active.style.display = "inline-block";
            speakText("Voice response enabled.");
        } else {
            muted.style.display = "inline-block";
            active.style.display = "none";
            if (window.speechSynthesis) window.speechSynthesis.cancel();
        }
    }

    function speakText(text) {
        if (!isSpeechEnabled || !window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        // Remove markdown chars for speech
        const clean = text.replace(/[*#`_~[\]]/g, "").replace(/https?:\/\/\S+/g, "");
        const utterance = new SpeechSynthesisUtterance(clean);
        utterance.rate = 1.05;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
    }

    // Web Speech Recognition
    function toggleVoiceInput() {
        if (isListening) {
            stopVoiceInput();
            return;
        }

        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRec) {
            alert("Voice input is not supported by your current browser. Please use Chrome, Edge, or Safari.");
            return;
        }

        try {
            recognition = new SpeechRec();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = "en-IN"; // Supports English/Indian accents and Hindi terms

            recognition.onstart = () => {
                isListening = true;
                const status = document.getElementById("voiceRecordingStatus");
                const mic = document.getElementById("voiceMicBtn");
                if (status) status.style.display = "flex";
                if (mic) mic.classList.add("recording");
            };

            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                if (transcript) {
                    const input = document.getElementById("chatTextInput");
                    if (input) input.value = transcript;
                    handleUserMessage(transcript);
                }
            };

            recognition.onerror = (e) => {
                console.warn("Speech recognition error:", e.error);
                stopVoiceInput();
            };

            recognition.onend = () => {
                stopVoiceInput();
            };

            recognition.start();
        } catch (err) {
            console.error("Failed to start voice recognition:", err);
            stopVoiceInput();
        }
    }

    function stopVoiceInput() {
        isListening = false;
        const status = document.getElementById("voiceRecordingStatus");
        const mic = document.getElementById("voiceMicBtn");
        if (status) status.style.display = "none";
        if (mic) mic.classList.remove("recording");
        if (recognition) {
            try { recognition.stop(); } catch (e) {}
        }
    }

    // Format markdown-like text to HTML safely
    function formatBotMessage(text) {
        if (!text) return "";
        let formatted = text
            // Escape HTML
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
            // Bold **text**
            .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
            // Inline code `code`
            .replace(/`(.*?)`/g, "<code>$1</code>")
            // Linebreaks
            .replace(/\n\n/g, "</p><p>")
            .replace(/\n/g, "<br>");

        return `<p>${formatted}</p>`;
    }

    // Handle user message submission
    async function handleUserMessage(userText) {
        if (!userText.trim()) return;

        appendMessage("user", userText);
        showTypingIndicator(true);

        const auth = getAuthContext();

        try {
            const headers = { "Content-Type": "application/json" };
            if (auth.token) {
                headers["Authorization"] = `Bearer ${auth.token}`;
            }

            const response = await fetch(`${API_URL}/api/chat`, {
                method: "POST",
                headers: headers,
                body: JSON.stringify({
                    message: userText,
                    role_hint: auth.role,
                    history: messageHistory.slice(-4)
                })
            });

            showTypingIndicator(false);

            if (!response.ok) {
                appendMessage("bot", "⚠️ Maaf kijiye, server se connect karne mein problem aayi. Kripya thodi der baad dobara koshish karein.");
                return;
            }

            const data = await response.json();
            appendBotResponse(data);

            if (data.reply) {
                speakText(data.reply);
            }

            // Save to local context history
            messageHistory.push({ role: "user", content: userText });
            messageHistory.push({ role: "bot", content: data.reply });

        } catch (err) {
            console.error("Chat API error:", err);
            showTypingIndicator(false);
            appendMessage("bot", "⚠️ Backend server reachable nahi hai. Kripya check karein ki server run ho raha hai aur connection active hai.");
        }
    }

    // Append simple message bubble
    function appendMessage(sender, text) {
        const msgs = document.getElementById("chatMessages");
        const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        const bubble = document.createElement("div");

        if (sender === "user") {
            bubble.className = "message-bubble user-message";
            bubble.innerHTML = `
                <div class="message-content">
                    <p>${text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
                    <span class="message-time">${time}</span>
                </div>
            `;
        } else {
            bubble.className = "message-bubble bot-message";
            bubble.innerHTML = `
                <div class="bot-bubble-avatar">🤖</div>
                <div class="message-content">
                    ${formatBotMessage(text)}
                    <span class="message-time">${time}</span>
                </div>
            `;
        }

        msgs.appendChild(bubble);
        msgs.scrollTop = msgs.scrollHeight;
    }

    // Append rich bot response with cards, actions, and suggestions
    function appendBotResponse(data) {
        const msgs = document.getElementById("chatMessages");
        const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        const bubble = document.createElement("div");
        bubble.className = "message-bubble bot-message";

        let extraHTML = "";

        // If Action Required (e.g. Owner approve/reject request)
        if (data.action_required && data.action_required.type === "confirm_join_request") {
            const act = data.action_required;
            extraHTML += `
                <div class="chat-action-card">
                    <div class="action-card-header">
                        <strong>⚠️ Action Required: Request #${act.request_id}</strong>
                    </div>
                    <p>Tenant <strong>${act.tenant_name}</strong> has applied for <strong>${act.pg_name}</strong>.</p>
                    <div class="action-card-buttons">
                        <button type="button" class="action-btn approve-btn" data-action-type="approve_request" data-request-id="${act.request_id}">
                            ✓ Approve & Assign Bed
                        </button>
                        <button type="button" class="action-btn reject-btn" data-action-type="reject_request" data-request-id="${act.request_id}">
                            ✕ Reject
                        </button>
                    </div>
                </div>
            `;
        }

        // If PG search results returned, render clickable cards
        if (data.data_type === "pg_search_results" && Array.isArray(data.data)) {
            extraHTML += `
                <div class="chat-pg-cards-carousel">
                    ${data.data.map(p => `
                        <div class="chat-pg-mini-card">
                            <div class="pg-mini-header">
                                <strong>${p.pg_name}</strong>
                                <span class="pg-mini-rent">₹${p.monthly_rent}/mo</span>
                            </div>
                            <p class="pg-mini-loc">📍 ${p.address}, ${p.city}</p>
                            <div class="pg-mini-tags">
                                <span class="pg-mini-tag">${p.gender_allowed}</span>
                                <span class="pg-mini-tag">${p.pg_type}</span>
                            </div>
                            <button type="button" class="pg-mini-explore-btn" data-dashboard-action="findPgSection">
                                View Details & Join ➔
                            </button>
                        </div>
                    `).join("")}
                </div>
            `;
        }

        bubble.innerHTML = `
            <div class="bot-bubble-avatar">🤖</div>
            <div class="message-content">
                ${formatBotMessage(data.reply)}
                ${extraHTML}
                <span class="message-time">${time} • Live Verified</span>
            </div>
        `;

        msgs.appendChild(bubble);

        // Update follow-up suggestions
        if (data.suggestions && data.suggestions.length > 0) {
            const existingSuggestions = document.getElementById("chatSuggestionsList");
            if (existingSuggestions) existingSuggestions.remove();

            const sugContainer = document.createElement("div");
            sugContainer.id = "chatSuggestionsList";
            sugContainer.className = "chat-suggestions-container";
            sugContainer.innerHTML = `
                <span class="suggestions-label">💡 Follow-up suggestions:</span>
                <div class="suggestions-chips-grid">
                    ${data.suggestions.map(s => `<button type="button" class="suggestion-chip">${s}</button>`).join("")}
                </div>
            `;
            msgs.appendChild(sugContainer);
        }

        msgs.scrollTop = msgs.scrollHeight;
    }

    // Execute Owner Action (Approve / Reject) with authorization
    async function executeOwnerAction(actionType, requestId, buttonEl) {
        const auth = getAuthContext();
        if (auth.role !== "owner" || !auth.token) {
            alert("Please log in as a PG Owner to approve or reject requests.");
            return;
        }

        const isApprove = actionType.includes("approve");
        const actionLabel = isApprove ? "APPROVE" : "REJECT";
        if (!confirm(`Are you sure you want to ${actionLabel} join request #${requestId}?`)) {
            return;
        }

        // Disable button to prevent double-submit
        buttonEl.disabled = true;
        buttonEl.textContent = "Processing...";

        try {
            const response = await fetch(`${API_URL}/api/chat/action`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${auth.token}`
                },
                body: JSON.stringify({
                    action_type: actionType,
                    request_id: requestId
                })
            });

            const result = await response.json();
            if (response.ok) {
                appendMessage("bot", `✅ Success! Join request #${requestId} has been **${isApprove ? "Approved" : "Rejected"}**.\n\nThe tenant's record and room allocation have been updated.`);
                // If on owner.html, trigger real-time refresh
                if (typeof window.loadOwnerJoinRequests === "function") {
                    window.loadOwnerJoinRequests();
                }
                if (typeof window.loadOwnerDashboard === "function") {
                    window.loadOwnerDashboard();
                }
            } else {
                appendMessage("bot", `⚠️ Action failed: ${result.detail || "Unable to process request."}`);
            }
        } catch (err) {
            console.error("Action error:", err);
            appendMessage("bot", "⚠️ Server error processing action.");
        }
    }

    // Interactive Dashboard Navigation inside Chat
    function navigateToDashboardSection(sectionTarget) {
        // Close chat if on mobile
        if (window.innerWidth < 640) closeChatWidget();

        if (typeof window.showTenantSection === "function") {
            window.showTenantSection(sectionTarget);
        } else if (typeof window.showOwnerSection === "function") {
            window.showOwnerSection(sectionTarget);
        } else {
            // If on landing page, redirect to tenant auth
            window.location.href = "tenant-auth.html";
        }
    }

    function showTypingIndicator(show) {
        const ind = document.getElementById("chatTypingIndicator");
        if (ind) {
            ind.style.display = show ? "flex" : "none";
            const msgs = document.getElementById("chatMessages");
            if (show && msgs) msgs.scrollTop = msgs.scrollHeight;
        }
    }

    // Auto-initialize when DOM is ready
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initRobotWidget);
    } else {
        initRobotWidget();
    }
})();

