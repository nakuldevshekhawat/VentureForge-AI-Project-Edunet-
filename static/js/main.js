/* =============================================================================
   VentureForge AI – From Vision to Venture
   Main JavaScript Application Logic
   ============================================================================= */

"use strict";

/* ─── Constants & State ─────────────────────────────────────────────────── */
const State = {
  startupIdea: "",        // Current startup idea context
  isStreaming: false,     // Is AI currently generating a response?
  sessionActive: false,   // Has the user sent at least one message?
  turnCount: 0,           // Number of completed conversation turns
  currentTheme: "light",  // Active UI theme
};

/* ─── DOM Element References ─────────────────────────────────────────────── */
const DOM = {
  // Theme
  html:             document.documentElement,
  themeToggle:      document.getElementById("themeToggle"),
  themeToggleMobile:document.getElementById("themeToggleMobile"),
  themeIcon:        document.getElementById("themeIcon"),
  themeIconMobile:  document.getElementById("themeIconMobile"),

  // Screens
  heroScreen:       document.getElementById("heroScreen"),
  chatMessages:     document.getElementById("chatMessages"),

  // Input
  chatInputBar:     document.getElementById("chatInputBar"),
  chatInput:        document.getElementById("chatInput"),
  sendBtn:          document.getElementById("sendBtn"),
  charCount:        document.getElementById("charCount"),
  contextPill:      document.getElementById("contextPill"),
  contextPillText:  document.getElementById("contextPillText"),
  clearContextBtn:  document.getElementById("clearContextBtn"),

  // Hero
  startupIdeaInput: document.getElementById("startupIdeaInput"),
  analyzeIdeaBtn:   document.getElementById("analyzeIdeaBtn"),
  exploreSamplesBtn:document.getElementById("exploreSamplesBtn"),

  // Session
  newSessionBtn:    document.getElementById("newSessionBtn"),
  newSessionBtnMob: document.getElementById("newSessionBtnMobile"),
  confirmNewSession:document.getElementById("confirmNewSession"),
  turnCounter:      document.getElementById("turnCounter"),

  // Quick actions
  quickActionBtns:  document.querySelectorAll(".quick-action-btn"),
  sampleIdeaCards:  document.querySelectorAll(".sample-idea-card"),

  // Toast
  ventureforgeToast:      document.getElementById("ventureforgeToast"),
  toastMessage:     document.getElementById("toastMessage"),

  // Export
  exportContent:    document.getElementById("exportContent"),
  copyExportBtn:    document.getElementById("copyExportBtn"),
  downloadExportBtn:document.getElementById("downloadExportBtn"),
};

/* ─── Bootstrap Instances ────────────────────────────────────────────────── */
const BS = {
  newSessionModal: new bootstrap.Modal(document.getElementById("newSessionModal")),
  exportModal:     new bootstrap.Modal(document.getElementById("exportModal")),
  toast:           new bootstrap.Toast(DOM.ventureforgeToast, { delay: 3000 }),
  offcanvas:       bootstrap.Offcanvas.getOrCreateInstance(document.getElementById("mobileMenu")),
};

/* ─── marked.js Configuration ───────────────────────────────────────────── */
if (typeof marked !== "undefined") {
  marked.setOptions({
    breaks: true,       // Convert \n to <br>
    gfm: true,          // GitHub Flavored Markdown
    tables: true,       // Table support
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   THEME MANAGEMENT
═══════════════════════════════════════════════════════════════════════════ */

function initTheme() {
  const saved = localStorage.getItem("ventureforge-theme");
  const preferred = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  const theme = saved || preferred;
  applyTheme(theme);
}

function applyTheme(theme) {
  State.currentTheme = theme;
  DOM.html.setAttribute("data-theme", theme);
  localStorage.setItem("ventureforge-theme", theme);

  const icon = theme === "dark" ? "bi-sun-fill" : "bi-moon-stars-fill";
  if (DOM.themeIcon) {
    DOM.themeIcon.className = `bi ${icon}`;
  }
  if (DOM.themeIconMobile) {
    DOM.themeIconMobile.className = `bi ${icon} me-2`;
  }
}

function toggleTheme() {
  applyTheme(State.currentTheme === "dark" ? "light" : "dark");
}

/* ═══════════════════════════════════════════════════════════════════════════
   CHAT INPUT HANDLING
═══════════════════════════════════════════════════════════════════════════ */

function initChatInput() {
  if (!DOM.chatInput) return;

  // Auto-resize textarea
  DOM.chatInput.addEventListener("input", () => {
    // Reset height to auto to get the correct scrollHeight
    DOM.chatInput.style.height = "auto";
    const newHeight = Math.min(DOM.chatInput.scrollHeight, 160);
    DOM.chatInput.style.height = newHeight + "px";

    // Update character counter
    const len = DOM.chatInput.value.length;
    if (DOM.charCount) DOM.charCount.textContent = len;

    // Enable/disable send button
    updateSendButton();
  });

  // Send on Enter (Shift+Enter = new line)
  DOM.chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!State.isStreaming) sendMessage();
    }
  });
}

function updateSendButton() {
  if (!DOM.sendBtn) return;
  const hasText = DOM.chatInput && DOM.chatInput.value.trim().length > 0;
  DOM.sendBtn.disabled = !hasText || State.isStreaming;
}

/* ═══════════════════════════════════════════════════════════════════════════
   CONTEXT (STARTUP IDEA) MANAGEMENT
═══════════════════════════════════════════════════════════════════════════ */

function setStartupIdeaContext(idea) {
  State.startupIdea = idea.trim();
  if (State.startupIdea && DOM.contextPill && DOM.contextPillText) {
    DOM.contextPillText.textContent = truncateText(State.startupIdea, 60);
    DOM.contextPill.classList.remove("d-none");
  }
}

function clearStartupIdeaContext() {
  State.startupIdea = "";
  if (DOM.contextPill) DOM.contextPill.classList.add("d-none");
}

/* ═══════════════════════════════════════════════════════════════════════════
   MESSAGE RENDERING
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Render a user message bubble.
 */
function appendUserMessage(text) {
  const wrapper = document.createElement("div");
  wrapper.className = "message-wrapper user-wrapper";

  const time = formatTime(new Date());
  wrapper.innerHTML = `
    <div class="d-flex flex-column align-items-end">
      <div class="message-bubble user-bubble">${escapeHtml(text)}</div>
      <div class="msg-timestamp text-end">${time}</div>
    </div>
    <div class="msg-avatar user-avatar">
      <i class="bi bi-person-fill"></i>
    </div>
  `;

  DOM.chatMessages.appendChild(wrapper);
  scrollToBottom();
}

/**
 * Render an AI message bubble with Markdown support.
 * Returns the bubble element so content can be streamed/updated.
 */
function appendAIMessage(text, isFinal = true) {
  const wrapper = document.createElement("div");
  wrapper.className = "message-wrapper ai-wrapper";

  const time = formatTime(new Date());
  const renderedHtml = renderMarkdown(text);

  wrapper.innerHTML = `
    <div class="msg-avatar ai-avatar">
      <i class="bi bi-rocket-takeoff-fill"></i>
    </div>
    <div class="d-flex flex-column" style="max-width:78%;min-width:0">
      <div class="message-bubble ai-bubble">${renderedHtml}</div>
      <div class="d-flex align-items-center gap-2 mt-1">
        <div class="msg-timestamp">${time} · IBM Granite</div>
        ${isFinal ? renderMsgActions() : ""}
      </div>
    </div>
  `;

  if (isFinal) {
    attachMsgActionHandlers(wrapper, text);
  }

  DOM.chatMessages.appendChild(wrapper);
  scrollToBottom();
  return wrapper;
}

function renderMsgActions() {
  return `
    <div class="msg-actions">
      <button class="msg-action-btn copy-msg-btn">
        <i class="bi bi-clipboard"></i> Copy
      </button>
      <button class="msg-action-btn export-msg-btn">
        <i class="bi bi-box-arrow-up"></i> Export
      </button>
    </div>
  `;
}

function attachMsgActionHandlers(wrapper, rawText) {
  const copyBtn = wrapper.querySelector(".copy-msg-btn");
  const exportBtn = wrapper.querySelector(".export-msg-btn");

  if (copyBtn) {
    copyBtn.addEventListener("click", () => {
      copyToClipboard(rawText);
      showToast("Copied to clipboard!", "success");
    });
  }

  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      openExportModal(rawText);
    });
  }
}

/**
 * Show a typing/thinking indicator.
 */
function showTypingIndicator() {
  removeTypingIndicator();
  const wrapper = document.createElement("div");
  wrapper.className = "message-wrapper ai-wrapper";
  wrapper.id = "typingIndicator";

  wrapper.innerHTML = `
    <div class="msg-avatar ai-avatar">
      <i class="bi bi-rocket-takeoff-fill"></i>
    </div>
    <div>
      <div class="typing-indicator">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
      <div class="msg-timestamp mt-1">VentureForge AI is thinking…</div>
    </div>
  `;

  DOM.chatMessages.appendChild(wrapper);
  scrollToBottom();
}

function removeTypingIndicator() {
  const existing = document.getElementById("typingIndicator");
  if (existing) existing.remove();
}

/* ═══════════════════════════════════════════════════════════════════════════
   SEND MESSAGE & API CALL
═══════════════════════════════════════════════════════════════════════════ */

async function sendMessage(overrideText = null) {
  const message = overrideText || (DOM.chatInput ? DOM.chatInput.value.trim() : "");
  if (!message || State.isStreaming) return;

  // Transition from hero to chat view (first message)
  if (!State.sessionActive) {
    activateChatMode();
  }

  // Clear input
  if (!overrideText && DOM.chatInput) {
    DOM.chatInput.value = "";
    DOM.chatInput.style.height = "auto";
    if (DOM.charCount) DOM.charCount.textContent = "0";
  }

  // Render user message
  appendUserMessage(message);
  updateSendButton();
  showTypingIndicator();

  // Lock UI while generating
  State.isStreaming = true;
  if (DOM.sendBtn) DOM.sendBtn.disabled = true;

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: message,
        startup_idea: State.startupIdea,
      }),
    });

    const data = await response.json();
    removeTypingIndicator();

    if (data.success) {
      appendAIMessage(data.response, true);
      State.turnCount = data.turn_count || State.turnCount + 1;
      if (DOM.turnCounter) DOM.turnCounter.textContent = State.turnCount;
    } else {
      appendErrorMessage(data.error || "An error occurred. Please try again.");
    }
  } catch (err) {
    removeTypingIndicator();
    appendErrorMessage("Network error. Please check your connection and try again.");
    console.error("[VentureForge AI] Fetch error:", err);
  } finally {
    State.isStreaming = false;
    updateSendButton();
    if (DOM.chatInput) DOM.chatInput.focus();
  }
}

/**
 * Render an error message bubble.
 */
function appendErrorMessage(errorText) {
  const wrapper = document.createElement("div");
  wrapper.className = "message-wrapper ai-wrapper";
  wrapper.innerHTML = `
    <div class="msg-avatar ai-avatar" style="background:var(--bs-danger)">
      <i class="bi bi-exclamation-triangle-fill"></i>
    </div>
    <div>
      <div class="message-bubble ai-bubble" style="border-color:var(--bs-danger-border-subtle);background:var(--bs-danger-bg-subtle)">
        <strong><i class="bi bi-exclamation-triangle me-2 text-danger"></i>Error</strong><br>
        <span style="color:var(--bs-danger)">${escapeHtml(errorText)}</span>
      </div>
      <div class="msg-timestamp mt-1">${formatTime(new Date())}</div>
    </div>
  `;
  DOM.chatMessages.appendChild(wrapper);
  scrollToBottom();
}

/* ═══════════════════════════════════════════════════════════════════════════
   CHAT MODE ACTIVATION
═══════════════════════════════════════════════════════════════════════════ */

function activateChatMode() {
  State.sessionActive = true;

  // Hide hero, show chat
  if (DOM.heroScreen) DOM.heroScreen.classList.add("d-none");
  if (DOM.chatMessages) DOM.chatMessages.classList.remove("d-none");
}

function resetToHero() {
  State.sessionActive = false;
  State.turnCount = 0;
  State.startupIdea = "";

  if (DOM.heroScreen) DOM.heroScreen.classList.remove("d-none");
  if (DOM.chatMessages) {
    DOM.chatMessages.classList.add("d-none");
    DOM.chatMessages.innerHTML = "";
  }
  if (DOM.contextPill) DOM.contextPill.classList.add("d-none");
  if (DOM.turnCounter) DOM.turnCounter.textContent = "0";
  if (DOM.chatInput) {
    DOM.chatInput.value = "";
    DOM.chatInput.style.height = "auto";
    if (DOM.charCount) DOM.charCount.textContent = "0";
  }
  updateSendButton();
}

/* ═══════════════════════════════════════════════════════════════════════════
   SESSION MANAGEMENT
═══════════════════════════════════════════════════════════════════════════ */

async function resetSession() {
  try {
    await fetch("/api/reset", { method: "POST" });
    resetToHero();
    showToast("New session started. Ready for your next idea! 🚀", "success");
    BS.newSessionModal.hide();
    BS.offcanvas.hide();
  } catch (err) {
    showToast("Failed to reset session.", "error");
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   QUICK ACTIONS & SAMPLE IDEAS
═══════════════════════════════════════════════════════════════════════════ */

function handleQuickAction(prompt) {
  if (!State.sessionActive && State.startupIdea) {
    // User has typed an idea but not sent — start session with quick action
    sendMessage(prompt);
  } else if (State.sessionActive) {
    sendMessage(prompt);
  } else {
    // Populate chat input and focus
    if (DOM.chatInput) {
      DOM.chatInput.value = prompt;
      DOM.chatInput.dispatchEvent(new Event("input"));
      DOM.chatInput.focus();
    }
  }
  BS.offcanvas.hide();
}

function handleSampleIdea(idea) {
  State.startupIdea = idea;

  // Set in hero textarea if visible
  if (DOM.startupIdeaInput && !DOM.heroScreen.classList.contains("d-none")) {
    DOM.startupIdeaInput.value = idea;
  }

  // Set context pill
  setStartupIdeaContext(idea);
  showToast("Sample idea loaded! Click 'Analyze My Idea' or ask a question.", "info");
  BS.offcanvas.hide();
}

/* ═══════════════════════════════════════════════════════════════════════════
   EXPORT & COPY
═══════════════════════════════════════════════════════════════════════════ */

function openExportModal(text) {
  if (DOM.exportContent) {
    DOM.exportContent.textContent = text;
  }
  BS.exportModal.show();
}

function exportAllConversation() {
  // Collect all AI messages
  const allMessages = Array.from(
    document.querySelectorAll(".ai-bubble")
  ).map((el) => el.innerText).join("\n\n---\n\n");

  if (!allMessages.trim()) {
    showToast("No conversation to export yet.", "warning");
    return;
  }

  openExportModal(allMessages);
}

/* ═══════════════════════════════════════════════════════════════════════════
   UTILITY FUNCTIONS
═══════════════════════════════════════════════════════════════════════════ */

function renderMarkdown(text) {
  if (typeof marked !== "undefined" && typeof DOMPurify !== "undefined") {
    const raw = marked.parse(text);
    return DOMPurify.sanitize(raw, {
      ALLOWED_TAGS: [
        "p","br","strong","em","b","i","u","s","del","ins",
        "h1","h2","h3","h4","h5","h6",
        "ul","ol","li","dl","dt","dd",
        "table","thead","tbody","tr","th","td",
        "code","pre","blockquote","hr",
        "a","span","div",
      ],
      ALLOWED_ATTR: ["href","target","rel","class","id"],
    });
  }
  // Fallback: basic escaping
  return escapeHtml(text).replace(/\n/g, "<br>");
}

function escapeHtml(text) {
  const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
  return String(text).replace(/[&<>"']/g, (c) => map[c]);
}

function truncateText(text, maxLen) {
  return text.length <= maxLen ? text : text.slice(0, maxLen) + "…";
}

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function scrollToBottom() {
  if (DOM.chatMessages) {
    setTimeout(() => {
      DOM.chatMessages.scrollTop = DOM.chatMessages.scrollHeight;
    }, 50);
  }
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Fallback for older browsers
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }
}

function downloadTextFile(content, filename) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Show a toast notification.
 * @param {string} message - The notification text.
 * @param {"success"|"error"|"warning"|"info"} type
 */
function showToast(message, type = "info") {
  if (!DOM.ventureforgeToast || !DOM.toastMessage) return;

  const colorMap = {
    success: "#22c55e",
    error: "#ef4444",
    warning: "#f59e0b",
    info: "#3b82f6",
  };

  DOM.ventureforgeToast.style.borderLeft = `4px solid ${colorMap[type] || colorMap.info}`;
  DOM.toastMessage.textContent = message;
  BS.toast.show();
}

/* ═══════════════════════════════════════════════════════════════════════════
   EVENT LISTENER WIRING
═══════════════════════════════════════════════════════════════════════════ */

function attachEventListeners() {

  // ── Theme Toggles ──────────────────────────────────────────────────────
  if (DOM.themeToggle)       DOM.themeToggle.addEventListener("click", toggleTheme);
  if (DOM.themeToggleMobile) DOM.themeToggleMobile.addEventListener("click", toggleTheme);

  // ── Send Button ────────────────────────────────────────────────────────
  if (DOM.sendBtn) {
    DOM.sendBtn.addEventListener("click", () => sendMessage());
  }

  // ── Hero: Analyze Idea Button ──────────────────────────────────────────
  if (DOM.analyzeIdeaBtn) {
    DOM.analyzeIdeaBtn.addEventListener("click", () => {
      const idea = DOM.startupIdeaInput ? DOM.startupIdeaInput.value.trim() : "";
      if (!idea) {
        showToast("Please describe your startup idea first!", "warning");
        DOM.startupIdeaInput && DOM.startupIdeaInput.focus();
        return;
      }
      setStartupIdeaContext(idea);
      sendMessage(
        `I have a startup idea: ${idea}\n\nPlease validate this idea and give me an initial assessment of its potential, key opportunities, and main challenges I should consider.`
      );
    });
  }

  // ── Hero: Explore Samples Button ──────────────────────────────────────
  if (DOM.exploreSamplesBtn) {
    DOM.exploreSamplesBtn.addEventListener("click", () => {
      // Scroll to sample ideas in sidebar or open offcanvas on mobile
      const sidebarSamples = document.getElementById("sampleIdeasList");
      if (sidebarSamples) {
        sidebarSamples.scrollIntoView({ behavior: "smooth" });
      }
      // On mobile, open offcanvas
      if (window.innerWidth < 992) {
        BS.offcanvas.show();
      }
    });
  }

  // ── Quick Action Buttons ───────────────────────────────────────────────
  document.querySelectorAll(".quick-action-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const prompt = btn.dataset.prompt;
      if (prompt) handleQuickAction(prompt);
    });
  });

  // ── Sample Idea Cards ──────────────────────────────────────────────────
  document.querySelectorAll(".sample-idea-card").forEach((card) => {
    card.addEventListener("click", () => {
      const idea = card.dataset.idea;
      if (idea) handleSampleIdea(idea);
    });
  });

  // ── New Session Buttons ────────────────────────────────────────────────
  [DOM.newSessionBtn, DOM.newSessionBtnMob].forEach((btn) => {
    if (btn) {
      btn.addEventListener("click", () => {
        if (State.sessionActive) {
          BS.newSessionModal.show();
        } else {
          resetSession();
        }
      });
    }
  });

  if (DOM.confirmNewSession) {
    DOM.confirmNewSession.addEventListener("click", resetSession);
  }

  // ── Context Pill Clear ─────────────────────────────────────────────────
  if (DOM.clearContextBtn) {
    DOM.clearContextBtn.addEventListener("click", () => {
      clearStartupIdeaContext();
      showToast("Idea context cleared.", "info");
    });
  }

  // ── Hero: Textarea — Enter key to analyze ─────────────────────────────
  if (DOM.startupIdeaInput) {
    DOM.startupIdeaInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey) {
        e.preventDefault();
        DOM.analyzeIdeaBtn && DOM.analyzeIdeaBtn.click();
      }
    });
  }

  // ── Export Modal Buttons ───────────────────────────────────────────────
  if (DOM.copyExportBtn) {
    DOM.copyExportBtn.addEventListener("click", async () => {
      const text = DOM.exportContent ? DOM.exportContent.textContent : "";
      await copyToClipboard(text);
      showToast("Copied to clipboard!", "success");
    });
  }

  if (DOM.downloadExportBtn) {
    DOM.downloadExportBtn.addEventListener("click", () => {
      const text = DOM.exportContent ? DOM.exportContent.textContent : "";
      const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      downloadTextFile(text, `ventureforge-blueprint-${ts}.txt`);
      showToast("Blueprint downloaded!", "success");
    });
  }

}

/* ═══════════════════════════════════════════════════════════════════════════
   AI READINESS CHECK
═══════════════════════════════════════════════════════════════════════════ */

async function checkAIStatus() {
  try {
    const res = await fetch("/api/status");
    const data = await res.json();
    if (!data.ai_ready) {
      console.warn("[VentureForge AI] IBM watsonx.ai not configured.");
    }
  } catch {
    // Silent — status check is non-critical
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   WELCOME MESSAGE
═══════════════════════════════════════════════════════════════════════════ */

function showWelcomeMessageIfNeeded() {
  // Only shown if session has existing history (page reload with active session)
  const serverDataEl = document.getElementById("ventureforge-server-data");
  const config = serverDataEl ? JSON.parse(serverDataEl.textContent) : {};
  if (!config.aiReady) return;

  fetch("/api/history")
    .then((r) => r.json())
    .then((data) => {
      if (data.success && data.history && data.history.length > 0) {
        activateChatMode();
        data.history.forEach((turn) => {
          if (turn.role === "user") {
            appendUserMessage(turn.content);
          } else {
            appendAIMessage(turn.content, true);
          }
        });
        State.turnCount = data.turn_count || 0;
        if (DOM.turnCounter) DOM.turnCounter.textContent = State.turnCount;
      }
    })
    .catch(() => {});
}

/* ═══════════════════════════════════════════════════════════════════════════
   APPLICATION BOOT
═══════════════════════════════════════════════════════════════════════════ */

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initChatInput();
  attachEventListeners();
  checkAIStatus();
  showWelcomeMessageIfNeeded();

  console.log(
    "%c🚀 VentureForge AI – From Vision to Venture\n%cPowered by IBM Granite on watsonx.ai",
    "color:#0f62fe;font-size:16px;font-weight:800;",
    "color:#8d8d8d;font-size:12px;"
  );
});
