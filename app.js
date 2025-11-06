// State
const state = {
  conversations: {},
  currentId: null,
  settings: {
    apiKey: "euri-7e7c40fa68a0a0e43829e47f01a890c191ee5ecdde4537aabf6bc02b8955df53",
    model: "gpt-4.1-nano",
    temperature: 0.7,
    max_tokens: 1000,
    enterToSend: true,
    language: "en"
  }
};

// DOM
const messagesEl = document.getElementById("messages");
const sendBtn = document.getElementById("sendBtn");
const userInput = document.getElementById("userInput");
const newChatBtn = document.getElementById("newChatBtn");
const convoList = document.getElementById("convoList");
const settingsBtn = document.getElementById("settingsBtn");
const settingsModal = document.getElementById("settingsModal");
const closeSettings = document.getElementById("closeSettings");
const saveSettings = document.getElementById("saveSettings");
const apiKeyInput = document.getElementById("apiKeyInput");
const modelSelect = document.getElementById("modelSelect");
const tempInput = document.getElementById("tempInput");
const maxTokensInput = document.getElementById("maxTokensInput");
const enterToSend = document.getElementById("enterToSend");
const themeToggle = document.getElementById("themeToggle");
const helpBtn = document.getElementById("helpBtn");
const helpModal = document.getElementById("helpModal");
const closeHelp = document.getElementById("closeHelp");
const openSettingsFromHelp = document.getElementById("openSettingsFromHelp");
const exportAllBtn = document.getElementById("exportAllBtn");
const clearAllBtn = document.getElementById("clearAllBtn");
const attachBtn = document.getElementById("attachBtn");
const fileInput = document.getElementById("fileInput");
const historyBtn = document.getElementById("historyBtn");
const historyModal = document.getElementById("historyModal");
const closeHistory = document.getElementById("closeHistory");
const historySearch = document.getElementById("historySearch");
const historyList = document.getElementById("historyList");
const historySortBtn = document.getElementById("historySortBtn");
const langSelect = document.getElementById("langSelect");
const settingsLangSelect = document.getElementById("settingsLangSelect");

// Utilities
const STORAGE_KEY = "halya_euron_chat_v1";
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    Object.assign(state, parsed);
  } catch {}
}
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
function now() {
  return new Date().toISOString();
}
function fmtTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"});
}

// Conversations
function ensureConvo(id) {
  if (!state.conversations[id]) {
    state.conversations[id] = { id, title: "New chat", messages: [], pinned: false, updatedAt: now() };
  }
}
function newChat() {
  const id = uid();
  ensureConvo(id);
  state.currentId = id;
  // Warm welcome from Halya
  const welcome = getDict().welcome || "Welcome! I’m Halya — your guide. How can I help today?";
  state.conversations[id].messages.push({ id: uid(), role: "assistant", content: welcome, createdAt: now() });
  state.conversations[id].updatedAt = now();
  save();
  render();
}
function currentConvo() {
  if (!state.currentId) {
    const first = Object.keys(state.conversations)[0];
    if (first) state.currentId = first; else newChat();
  }
  ensureConvo(state.currentId);
  return state.conversations[state.currentId];
}

// Rendering
function renderConvos() {
  const ids = Object.keys(state.conversations);
  // sort: pinned first, then by updatedAt desc
  const sorted = ids.sort((a,b) => {
    const ca = state.conversations[a];
    const cb = state.conversations[b];
    if (cb.pinned !== ca.pinned) return cb.pinned ? 1 : -1; // keep true first
    return (cb.updatedAt||"").localeCompare(ca.updatedAt||"");
  });
  convoList.innerHTML = "";
  sorted.forEach(id => {
    const c = state.conversations[id];
    const item = document.createElement("div");
    item.className = "convo-item" + (id === state.currentId ? " active" : "");
    const last = c.messages[c.messages.length - 1];
    item.innerHTML = `
      <div class="avatar bot">${c.title.charAt(0).toUpperCase()}</div>
      <div>
        <div class="convo-title">${escapeHtml(c.title)}</div>
        <div class="convo-meta">${last ? escapeHtml(truncate(last.content, 40)) : "No messages yet"} • ${fmtTime(c.updatedAt)}</div>
      </div>
    `;
    item.addEventListener("click", () => {
      state.currentId = id; save(); render();
    });
    convoList.appendChild(item);
  });
}

function renderMessages() {
  const convo = currentConvo();
  messagesEl.innerHTML = "";
  convo.messages.forEach(m => messagesEl.appendChild(messageNode(m)));
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function messageNode(message) {
  const wrap = document.createElement("div");
  wrap.className = `msg from-${message.role === "user" ? "user" : "bot"} appear`;
  wrap.dataset.id = message.id;
  wrap.innerHTML = `
    <div class="avatar ${message.role === "user" ? "" : "bot"}">${message.role === "user" ? "U" : "H"}</div>
    <div class="bubble">
      <div class="content">${mdToHtml(escapeHtml(message.content))}</div>
      <div class="meta-row">
        <span class="chip">${message.role}</span>
        <span>${fmtTime(message.createdAt)}</span>
        <div class="actions">
          <button class="btn-icon" data-act="copy">Copy</button>
          <button class="btn-icon" data-act="retry" ${message.role === "user" ? "" : "disabled"}>Retry</button>
          <button class="btn-icon" data-act="delete">Delete</button>
        </div>
      </div>
    </div>
  `;
  wrap.querySelectorAll(".btn-icon").forEach(b => b.addEventListener("click", onMsgAction));
  return wrap;
}

function onMsgAction(e){
  const act = e.currentTarget.dataset.act;
  const msgEl = e.currentTarget.closest(".msg");
  const id = msgEl.dataset.id;
  const convo = currentConvo();
  const idx = convo.messages.findIndex(m => m.id === id);
  const msg = convo.messages[idx];
  if (!msg) return;
  if (act === "copy") {
    navigator.clipboard.writeText(msg.content);
  } else if (act === "delete") {
    convo.messages.splice(idx, 1); save(); renderMessages();
  } else if (act === "retry" && msg.role === "user") {
    // Remove any following assistant response
    const next = convo.messages[idx+1];
    if (next && next.role === "assistant") {
      convo.messages.splice(idx+1, 1);
    }
    save(); renderMessages();
    sendToModel(msg.content, { isRetry: true });
  }
}

function render(){
  renderConvos();
  renderMessages();
}

// Events setup function - called after DOM is ready
function setupEventListeners() {
  // Send button events
  if (sendBtn) {
    sendBtn.addEventListener("click", (e) => { 
      e.preventDefault(); 
      e.stopPropagation(); 
      console.log("Send button clicked");
      submitMessage(); 
    });
    sendBtn.addEventListener("touchend", (e) => { 
      e.preventDefault(); 
      e.stopPropagation(); 
      console.log("Send button touched");
      submitMessage(); 
    });
    // Ensure button is enabled
    sendBtn.disabled = false;
    sendBtn.style.pointerEvents = "auto";
    sendBtn.type = "button";
    console.log("Send button setup complete");
  } else {
    console.error("Send button not found!");
  }

  // User input events
  if (userInput) {
    userInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey && state.settings.enterToSend){
        e.preventDefault(); 
        console.log("Enter key pressed");
        submitMessage();
      }
    });
    // Mobile: handle form submission
    userInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter" && !e.shiftKey && state.settings.enterToSend){
        e.preventDefault(); 
        submitMessage();
      }
    });
    userInput.addEventListener("input", autoSizeTextarea);
    // Ensure input is enabled
    userInput.disabled = false;
    userInput.readOnly = false;
    console.log("User input setup complete");
  } else {
    console.error("User input not found!");
  }
  
  if (newChatBtn) newChatBtn.addEventListener("click", newChat);
}
document.querySelectorAll(".hint").forEach(h => h.addEventListener("click", () => {
  userInput.value = h.dataset.text || "";
  userInput.focus();
}));

settingsBtn.addEventListener("click", () => openModal(settingsModal));
closeSettings.addEventListener("click", () => closeModal(settingsModal));
saveSettings.addEventListener("click", saveSettingsModal);
helpBtn.addEventListener("click", () => openModal(helpModal));
closeHelp.addEventListener("click", () => closeModal(helpModal));
openSettingsFromHelp.addEventListener("click", () => { closeModal(helpModal); openModal(settingsModal); });
exportAllBtn.addEventListener("click", exportAll);
clearAllBtn.addEventListener("click", () => { if (confirm("Clear all conversations?")){ state.conversations = {}; state.currentId = null; save(); render(); }});

attachBtn.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", async () => {
  if (!fileInput.files?.length) return;
  const file = fileInput.files[0];
  const content = `I have attached a file named "${file.name}" (${Math.round(file.size/1024)} KB). Please acknowledge and ask me how to use it.`;
  userInput.value = content;
  submitMessage();
  fileInput.value = "";
});

// Modal helpers
function openModal(el){ el.classList.add("show"); el.setAttribute("open", ""); el.setAttribute("aria-hidden","false"); }
function closeModal(el){ el.classList.remove("show"); el.removeAttribute("open"); el.setAttribute("aria-hidden","true"); }

function saveSettingsModal(){
  state.settings.apiKey = apiKeyInput.value.trim();
  state.settings.model = modelSelect.value;
  state.settings.temperature = Number(tempInput.value) || 0.7;
  state.settings.max_tokens = Number(maxTokensInput.value) || 1000;
  state.settings.enterToSend = !!enterToSend.checked;
  if (settingsLangSelect) state.settings.language = settingsLangSelect.value;
  save();
  closeModal(settingsModal);
  applyLanguage();
}

// Submission and API
let isSending = false;
async function submitMessage(){
  console.log("submitMessage called", { isSending, userInput: userInput?.value });
  
  if (isSending) {
    console.log("Already sending, ignoring");
    return; // Prevent double-tap on mobile
  }
  
  if (!userInput) {
    console.error("userInput not found!");
    return;
  }
  
  const text = userInput.value.trim();
  if (!text) {
    console.log("No text to send");
    return;
  }
  
  console.log("Sending message:", text);
  isSending = true;
  
  if (sendBtn) {
    sendBtn.disabled = true;
    sendBtn.style.opacity = "0.6";
    sendBtn.textContent = "Sending...";
  }
  
  try {
    const convo = currentConvo();
    const userMsg = { id: uid(), role: "user", content: text, createdAt: now() };
    convo.messages.push(userMsg);
    // Update title from first user message
    if (convo.title === "New chat") {
      convo.title = truncate(text, 28);
    }
    convo.updatedAt = now();
    userInput.value = "";
    if (typeof autoSizeTextarea === 'function') autoSizeTextarea();
    save();
    renderMessages();
    await sendToModel(text);
    console.log("Message sent successfully");
  } catch (err) {
    console.error("Submit error:", err);
    alert("Error sending message: " + err.message);
  } finally {
    isSending = false;
    if (sendBtn) {
      sendBtn.disabled = false;
      sendBtn.style.opacity = "1";
      const dict = getDict();
      sendBtn.textContent = (dict && dict.composer && dict.composer.send) ? dict.composer.send : "Send";
    }
  }
}

function addTyping(){
  const el = document.createElement("div");
  el.className = "msg from-bot";
  el.id = "typing";
  el.innerHTML = `
    <div class="avatar bot">H</div>
    <div class="bubble"><div class="typing"><span></span><span></span><span></span></div></div>
  `;
  messagesEl.appendChild(el); messagesEl.scrollTop = messagesEl.scrollHeight;
}
function removeTyping(){
  const t = document.getElementById("typing"); if (t) t.remove();
}

async function sendToModel(text, { isRetry = false } = {}){
  const convo = currentConvo();
  const contextMessages = convo.messages.map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }));
  const systemPrompt = getSystemPromptForLanguage(state.settings.language);
  const messagesPayload = systemPrompt ? [{ role: "system", content: systemPrompt }, ...contextMessages] : contextMessages;
  addTyping();
  
  if (!state.settings.apiKey || !state.settings.apiKey.trim()) {
    removeTyping();
    convo.messages.push({ 
      id: uid(), 
      role: "assistant", 
      content: "Error: API key is missing. Please go to Settings and add your Euron API key to use Your Assistant.", 
      createdAt: now() 
    });
    convo.updatedAt = now();
    save();
    renderMessages();
    return;
  }
  
  try {
    console.log("Sending request to Euron API...");
    // Use proxy endpoint when deployed to avoid CORS issues
    const isDeployed = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
    const apiUrl = isDeployed ? '/api/chat' : 'https://api.euron.one/api/v1/euri/chat/completions';
    
    const requestBody = isDeployed ? {
      messages: messagesPayload,
      model: state.settings.model,
      max_tokens: state.settings.max_tokens,
      temperature: state.settings.temperature,
      apiKey: state.settings.apiKey.trim()
    } : {
      messages: messagesPayload,
      model: state.settings.model,
      max_tokens: state.settings.max_tokens,
      temperature: state.settings.temperature
    };
    
    const headers = isDeployed ? {
      "Content-Type": "application/json"
    } : {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${state.settings.apiKey.trim()}`
    };
    
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(requestBody),
      mode: "cors"
    });

    console.log("Response status:", res.status);
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error("API Error:", res.status, errorText);
      let errorMsg = `API Error (${res.status})`;
      try {
        const errorData = JSON.parse(errorText);
        errorMsg = errorData.error?.message || errorData.message || errorMsg;
      } catch {}
      throw new Error(errorMsg);
    }
    
    const data = await res.json();
    console.log("API Response:", data);
    const content = extractAssistantText(data) || "(No response)";
    convo.messages.push({ id: uid(), role: "assistant", content, createdAt: now() });
    convo.updatedAt = now();
    save();
  } catch (err) {
    console.error("Send error:", err);
    let errorMsg = err.message || "Unknown error";
    
    // Check for CORS errors
    if (err.message.includes("Failed to fetch") || err.message.includes("NetworkError") || err.name === "TypeError") {
      errorMsg = "Network error: This might be a CORS issue. The API may not allow requests from this domain. Please check your API key and try again.";
    }
    
    // Check for authentication errors
    if (err.message.includes("401") || err.message.includes("403") || err.message.includes("Unauthorized")) {
      errorMsg = "Authentication failed: Please check your API key in Settings.";
    }
    
    const msg = isRetry ? "Retry failed" : "Request failed";
    convo.messages.push({ 
      id: uid(), 
      role: "assistant", 
      content: `${msg}: ${errorMsg}. ${err.message.includes("CORS") ? "" : "Open Settings and check your API key."}`, 
      createdAt: now() 
    });
    convo.updatedAt = now();
    save();
  } finally {
    removeTyping();
    renderMessages();
  }
}

function extractAssistantText(resp){
  // Try OpenAI-like structure
  try {
    if (resp && resp.choices && resp.choices[0] && resp.choices[0].message) {
      return resp.choices[0].message.content;
    }
  } catch {}
  // Fallback to string
  if (typeof resp === "string") return resp;
  return JSON.stringify(resp);
}

// Helpers
function escapeHtml(s){
  return s.replace(/[&<>\"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]));
}
function truncate(s, n){ return s.length>n ? s.slice(0,n-1)+"…" : s; }
function mdToHtml(s){
  // tiny markdown: bold ** **, italic * *, code ` `, line breaks
  let h = s
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\n/g, "<br>");
  return h;
}

function exportAll(){
  const blob = new Blob([JSON.stringify(state.conversations, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `halya-chats-${Date.now()}.json`;
  a.click();
}

function autoSizeTextarea(){
  userInput.style.height = "auto";
  const next = Math.min(userInput.scrollHeight, 200);
  userInput.style.height = next + "px";
}

// Theme toggle
themeToggle.addEventListener("click", () => {
  document.documentElement.classList.toggle("light");
});

// History UI
if (historyBtn) historyBtn.addEventListener("click", () => { openHistory(); });
if (closeHistory) closeHistory.addEventListener("click", () => closeModal(historyModal));
if (historySearch) historySearch.addEventListener("input", () => renderHistory());
if (historySortBtn) historySortBtn.addEventListener("click", () => cycleHistorySort());

let historySortMode = "updated"; // updated | title | count
function openHistory(){ renderHistory(); openModal(historyModal); }

function cycleHistorySort(){
  historySortMode = historySortMode === "updated" ? "title" : historySortMode === "title" ? "count" : "updated";
  renderHistory();
}

function renderHistory(){
  if (!historyList) return;
  const term = (historySearch?.value || "").toLowerCase();
  const list = Object.values(state.conversations);
  const filtered = list.filter(c => c.title.toLowerCase().includes(term));
  const sorted = filtered.sort((a,b) => {
    if (historySortMode === "title") return a.title.localeCompare(b.title);
    if (historySortMode === "count") return (b.messages?.length||0) - (a.messages?.length||0);
    return (b.updatedAt||"").localeCompare(a.updatedAt||"");
  });
  historyList.innerHTML = "";
  sorted.forEach(c => {
    const row = document.createElement("div");
    row.style.display = "grid";
    row.style.gridTemplateColumns = "1fr auto auto auto";
    row.style.gap = "8px";
    row.style.alignItems = "center";
    row.style.border = "1px solid #262626";
    row.style.borderRadius = "12px";
    row.style.padding = "10px";
    row.innerHTML = `
      <div>
        <div style="font-weight:700">${escapeHtml(c.title)}</div>
        <div style="font-size:12px;color:#a3a3a3">${c.messages.length} msgs • ${fmtTime(c.updatedAt)}${c.pinned ? " • Pinned" : ""}</div>
      </div>
      <button class="ghost" data-act="open" data-id="${c.id}">Open</button>
      <button class="ghost" data-act="rename" data-id="${c.id}">Rename</button>
      <button class="ghost" data-act="pin" data-id="${c.id}">${c.pinned ? "Unpin" : "Pin"}</button>
      <button class="danger ghost" data-act="delete" data-id="${c.id}">Delete</button>
    `;
    row.querySelectorAll("button").forEach(b => b.addEventListener("click", onHistoryAction));
    historyList.appendChild(row);
  });
}

function onHistoryAction(e){
  const act = e.currentTarget.dataset.act;
  const id = e.currentTarget.dataset.id;
  const c = state.conversations[id];
  if (!c) return;
  if (act === "open") {
    state.currentId = id; save(); closeModal(historyModal); render();
  } else if (act === "rename") {
    const name = prompt("Rename chat:", c.title) || c.title;
    c.title = name; c.updatedAt = now(); save(); renderHistory(); renderConvos();
  } else if (act === "pin") {
    c.pinned = !c.pinned; save(); renderHistory(); renderConvos();
  } else if (act === "delete") {
    if (confirm("Delete this chat?")) {
      delete state.conversations[id];
      if (state.currentId === id) state.currentId = null;
      save(); renderHistory(); renderConvos(); renderMessages();
    }
  }
}
if (langSelect) langSelect.addEventListener("change", () => { state.settings.language = langSelect.value; save(); applyLanguage(); });

// Init
function init(){
  console.log("Initializing app...");
  load();
  // Pre-fill settings UI
  if (apiKeyInput) apiKeyInput.value = state.settings.apiKey || "";
  if (modelSelect) modelSelect.value = state.settings.model || "gpt-4.1-nano";
  if (tempInput) tempInput.value = state.settings.temperature ?? 0.7;
  if (maxTokensInput) maxTokensInput.value = state.settings.max_tokens ?? 1000;
  if (enterToSend) enterToSend.checked = !!state.settings.enterToSend;
  if (settingsLangSelect) settingsLangSelect.value = state.settings.language || "en";
  if (langSelect) langSelect.value = state.settings.language || "en";
  applyLanguage();
  if (!Object.keys(state.conversations).length) newChat();
  render();
  
  // Setup event listeners after DOM is ready
  setupEventListeners();
  
  // Ensure textarea is enabled and focusable
  if (userInput) {
    userInput.disabled = false;
    userInput.readOnly = false;
    userInput.style.pointerEvents = "auto";
    userInput.style.opacity = "1";
  }
  // If no API key, open help
  if (!state.settings.apiKey) openModal(helpModal);

  // Auto demo once for your convenience
  try {
    const demoDone = localStorage.getItem("halya_demo_done");
    if (!demoDone && state.settings.apiKey) {
      const convo = currentConvo();
      const demoPrompt = "Write a poem about artificial intelligence";
      const userMsg = { id: uid(), role: "user", content: demoPrompt, createdAt: now() };
      convo.messages.push(userMsg);
      convo.title = "Demo chat";
      save();
      renderMessages();
      sendToModel(demoPrompt).then(() => {
        localStorage.setItem("halya_demo_done", "1");
      });
    }
  } catch {}
}

// I18n
const I18N = {
  en: {
    "sidebar.newChat":"+ New Chat",
    "sidebar.settings":"Settings",
    "sidebar.exportAll":"Export All",
    "sidebar.clearAll":"Clear All",
    "header.title":"Your Assistant",
    "header.subtitle":"Powered by euron.one • Netflix dark theme",
    "composer.placeholder":"Message Your Assistant",
    "composer.send":"Send",
    "composer.attach":"Attach file",
    "hints.poem":"AI Poem",
    "hints.summarize":"Summarize",
    "hints.explain":"Explain Code",
    "hints.marketing":"Marketing Ideas",
    "prompts.poem":"Write a poem about artificial intelligence",
    "prompts.summarize":"Summarize this text:",
    "prompts.explain":"Explain this code:",
    "prompts.marketing":"Generate ideas for a marketing campaign",
    "settings.title":"Settings",
    "settings.apiKey":"Euron API Key",
    "settings.keyNote":"Your key is stored locally in this browser.",
    "settings.model":"Model",
    "settings.temperature":"Temperature",
    "settings.maxTokens":"Max tokens",
    "settings.enterToSend":"Press Enter to send",
    "settings.language":"Language",
    "settings.save":"Save",
    "help.title":"Welcome",
    "help.body1":"<strong>Hello, I'm Halya.</strong> Welcome to your Halya chatbot powered by Euron.",
    "help.body2":"Open Settings to add your API key to start chatting. Your key will be stored locally only.",
    "help.body3":"Tip: Use quick prompts below the composer to get started.",
    "welcome":"Welcome! I’m Halya — your guide. How can I help today?"
  },
  es: {
    "sidebar.newChat":"+ Nuevo chat",
    "sidebar.settings":"Ajustes",
    "sidebar.exportAll":"Exportar todo",
    "sidebar.clearAll":"Borrar todo",
    "header.title":"Your Assistant",
    "header.subtitle":"Impulsado por euron.one • Tema oscuro",
    "composer.placeholder":"Mensaje a Tu Asistente",
    "composer.send":"Enviar",
    "composer.attach":"Adjuntar archivo",
    "hints.poem":"Poema IA",
    "hints.summarize":"Resumir",
    "hints.explain":"Explicar código",
    "hints.marketing":"Ideas de marketing",
    "prompts.poem":"Escribe un poema sobre inteligencia artificial",
    "prompts.summarize":"Resume este texto:",
    "prompts.explain":"Explica este código:",
    "prompts.marketing":"Genera ideas para una campaña de marketing",
    "settings.title":"Ajustes",
    "settings.apiKey":"Clave API de Euron",
    "settings.keyNote":"Tu clave se guarda localmente en este navegador.",
    "settings.model":"Modelo",
    "settings.temperature":"Temperatura",
    "settings.maxTokens":"Máx. tokens",
    "settings.enterToSend":"Pulsar Enter para enviar",
    "settings.language":"Idioma",
    "settings.save":"Guardar",
    "help.title":"Bienvenido",
    "help.body1":"<strong>Hola, soy Halya.</strong> Bienvenido a tu asistente con Euron.",
    "help.body2":"Abre Ajustes para añadir tu clave y empezar a chatear. Tu clave se guarda localmente.",
    "help.body3":"Consejo: Usa los atajos de abajo para empezar.",
    "welcome":"¡Bienvenido! Soy Halya — tu guía. ¿En qué puedo ayudarte hoy?"
  },
  fr: {
    "sidebar.newChat":"+ Nouvelle discussion",
    "sidebar.settings":"Paramètres",
    "sidebar.exportAll":"Exporter tout",
    "sidebar.clearAll":"Tout effacer",
    "header.title":"Your Assistant",
    "header.subtitle":"Propulsé par euron.one • Thème sombre",
    "composer.placeholder":"Message à Votre Assistant",
    "composer.send":"Envoyer",
    "composer.attach":"Joindre un fichier",
    "hints.poem":"Poème IA",
    "hints.summarize":"Résumer",
    "hints.explain":"Expliquer le code",
    "hints.marketing":"Idées marketing",
    "prompts.poem":"Écris un poème sur l’intelligence artificielle",
    "prompts.summarize":"Résume ce texte :",
    "prompts.explain":"Explique ce code :",
    "prompts.marketing":"Génère des idées pour une campagne marketing",
    "settings.title":"Paramètres",
    "settings.apiKey":"Clé API Euron",
    "settings.keyNote":"Votre clé est stockée localement dans ce navigateur.",
    "settings.model":"Modèle",
    "settings.temperature":"Température",
    "settings.maxTokens":"Jetons max",
    "settings.enterToSend":"Appuyer sur Entrée pour envoyer",
    "settings.language":"Langue",
    "settings.save":"Enregistrer",
    "help.title":"Bienvenue",
    "help.body1":"<strong>Bonjour, je suis Halya.</strong> Bienvenue dans votre assistant Euron.",
    "help.body2":"Ouvrez Paramètres pour ajouter votre clé et commencer à discuter. Votre clé reste locale.",
    "help.body3":"Astuce : utilisez les suggestions sous le champ de saisie.",
    "welcome":"Bienvenue ! Je suis Halya — votre guide. Comment puis-je vous aider aujourd’hui ?"
  },
  de: {
    "sidebar.newChat":"+ Neuer Chat",
    "sidebar.settings":"Einstellungen",
    "sidebar.exportAll":"Alles exportieren",
    "sidebar.clearAll":"Alles löschen",
    "header.title":"Your Assistant",
    "header.subtitle":"Bereitgestellt von euron.one • Dunkles Thema",
    "composer.placeholder":"Nachricht an Deinen Assistenten",
    "composer.send":"Senden",
    "composer.attach":"Datei anhängen",
    "hints.poem":"KI-Gedicht",
    "hints.summarize":"Zusammenfassen",
    "hints.explain":"Code erklären",
    "hints.marketing":"Marketing-Ideen",
    "prompts.poem":"Schreibe ein Gedicht über Künstliche Intelligenz",
    "prompts.summarize":"Fasse diesen Text zusammen:",
    "prompts.explain":"Erkläre diesen Code:",
    "prompts.marketing":"Erzeuge Ideen für eine Marketingkampagne",
    "settings.title":"Einstellungen",
    "settings.apiKey":"Euron API-Schlüssel",
    "settings.keyNote":"Dein Schlüssel wird lokal im Browser gespeichert.",
    "settings.model":"Modell",
    "settings.temperature":"Temperatur",
    "settings.maxTokens":"Max. Tokens",
    "settings.enterToSend":"Enter zum Senden",
    "settings.language":"Sprache",
    "settings.save":"Speichern",
    "help.title":"Willkommen",
    "help.body1":"<strong>Hallo, ich bin Halya.</strong> Willkommen bei deinem Euron-Assistenten.",
    "help.body2":"Öffne Einstellungen, um deinen Schlüssel hinzuzufügen. Er bleibt lokal.",
    "help.body3":"Tipp: Nutze die Schnellvorschläge unten.",
    "welcome":"Willkommen! Ich bin Halya — deine Begleiterin. Womit kann ich helfen?"
  },
  pt: {
    "sidebar.newChat":"+ Novo chat",
    "sidebar.settings":"Configurações",
    "sidebar.exportAll":"Exportar tudo",
    "sidebar.clearAll":"Limpar tudo",
    "header.title":"Your Assistant",
    "header.subtitle":"Com tecnologia euron.one • Tema escuro",
    "composer.placeholder":"Mensagem para Seu Assistente",
    "composer.send":"Enviar",
    "composer.attach":"Anexar arquivo",
    "hints.poem":"Poema IA",
    "hints.summarize":"Resumir",
    "hints.explain":"Explicar código",
    "hints.marketing":"Ideias de marketing",
    "prompts.poem":"Escreva um poema sobre inteligência artificial",
    "prompts.summarize":"Resuma este texto:",
    "prompts.explain":"Explique este código:",
    "prompts.marketing":"Gere ideias para uma campanha de marketing",
    "settings.title":"Configurações",
    "settings.apiKey":"Chave da API Euron",
    "settings.keyNote":"Sua chave é armazenada localmente neste navegador.",
    "settings.model":"Modelo",
    "settings.temperature":"Temperatura",
    "settings.maxTokens":"Máx. tokens",
    "settings.enterToSend":"Pressione Enter para enviar",
    "settings.language":"Idioma",
    "settings.save":"Salvar",
    "help.title":"Bem-vindo",
    "help.body1":"<strong>Olá, sou a Halya.</strong> Bem-vindo ao seu assistente Euron.",
    "help.body2":"Abra Configurações para adicionar sua chave. Ela ficará salva localmente.",
    "help.body3":"Dica: use os atalhos abaixo.",
    "welcome":"Bem-vindo! Eu sou a Halya — sua guia. Como posso ajudar hoje?"
  },
  it: {
    "sidebar.newChat":"+ Nuova chat",
    "sidebar.settings":"Impostazioni",
    "sidebar.exportAll":"Esporta tutto",
    "sidebar.clearAll":"Cancella tutto",
    "header.title":"Your Assistant",
    "header.subtitle":"Basato su euron.one • Tema scuro",
    "composer.placeholder":"Messaggia il Tuo Assistente",
    "composer.send":"Invia",
    "composer.attach":"Allega file",
    "hints.poem":"Poesia IA",
    "hints.summarize":"Riassumi",
    "hints.explain":"Spiega il codice",
    "hints.marketing":"Idee marketing",
    "prompts.poem":"Scrivi una poesia sull’intelligenza artificiale",
    "prompts.summarize":"Riassumi questo testo:",
    "prompts.explain":"Spiega questo codice:",
    "prompts.marketing":"Genera idee per una campagna marketing",
    "settings.title":"Impostazioni",
    "settings.apiKey":"Chiave API Euron",
    "settings.keyNote":"La chiave è salvata localmente in questo browser.",
    "settings.model":"Modello",
    "settings.temperature":"Temperatura",
    "settings.maxTokens":"Token max",
    "settings.enterToSend":"Invio per inviare",
    "settings.language":"Lingua",
    "settings.save":"Salva",
    "help.title":"Benvenuto",
    "help.body1":"<strong>Ciao, sono Halya.</strong> Benvenuto nel tuo assistente Euron.",
    "help.body2":"Apri Impostazioni per aggiungere la chiave. Rimane locale.",
    "help.body3":"Suggerimento: usa i suggerimenti rapidi.",
    "welcome":"Benvenuto! Sono Halya — la tua guida. Come posso aiutarti oggi?"
  },
  ru: {
    "sidebar.newChat":"+ Новый чат",
    "sidebar.settings":"Настройки",
    "sidebar.exportAll":"Экспортировать всё",
    "sidebar.clearAll":"Очистить всё",
    "header.title":"Your Assistant",
    "header.subtitle":"На базе euron.one • Тёмная тема",
    "composer.placeholder":"Сообщение Вашему Ассистенту",
    "composer.send":"Отправить",
    "composer.attach":"Прикрепить файл",
    "hints.poem":"Стих об ИИ",
    "hints.summarize":"Резюмировать",
    "hints.explain":"Объяснить код",
    "hints.marketing":"Идеи маркетинга",
    "prompts.poem":"Напиши стихотворение об искусственном интеллекте",
    "prompts.summarize":"Кратко изложи этот текст:",
    "prompts.explain":"Объясни этот код:",
    "prompts.marketing":"Сгенерируй идеи для маркетинговой кампании",
    "settings.title":"Настройки",
    "settings.apiKey":"API-ключ Euron",
    "settings.keyNote":"Ключ хранится локально в этом браузере.",
    "settings.model":"Модель",
    "settings.temperature":"Температура",
    "settings.maxTokens":"Макс. токенов",
    "settings.enterToSend":"Enter для отправки",
    "settings.language":"Язык",
    "settings.save":"Сохранить",
    "help.title":"Добро пожаловать",
    "help.body1":"<strong>Здравствуйте, я Халя.</strong> Ваш ассистент на базе Euron.",
    "help.body2":"Откройте настройки, чтобы добавить ключ. Он хранится локально.",
    "help.body3":"Совет: используйте быстрые подсказки ниже.",
    "welcome":"Добро пожаловать! Я Халя — ваш помощник. Чем помочь сегодня?"
  },
  zh: {
    "sidebar.newChat":"+ 新建对话",
    "sidebar.settings":"设置",
    "sidebar.exportAll":"导出全部",
    "sidebar.clearAll":"清除全部",
    "header.title":"Your Assistant",
    "header.subtitle":"由 euron.one 提供 • 深色主题",
    "composer.placeholder":"给您的助手发消息",
    "composer.send":"发送",
    "composer.attach":"附件",
    "hints.poem":"AI 诗歌",
    "hints.summarize":"摘要",
    "hints.explain":"解释代码",
    "hints.marketing":"营销创意",
    "prompts.poem":"写一首关于人工智能的诗",
    "prompts.summarize":"请总结这段文字：",
    "prompts.explain":"解释这段代码：",
    "prompts.marketing":"生成营销活动创意",
    "settings.title":"设置",
    "settings.apiKey":"Euron API 密钥",
    "settings.keyNote":"你的密钥只会保存在本地浏览器。",
    "settings.model":"模型",
    "settings.temperature":"温度",
    "settings.maxTokens":"最大 tokens",
    "settings.enterToSend":"按 Enter 发送",
    "settings.language":"语言",
    "settings.save":"保存",
    "help.title":"欢迎",
    "help.body1":"<strong>你好，我是 Halya。</strong> 欢迎使用你的 Euron 助手。",
    "help.body2":"打开设置添加 API 密钥即可开始聊天。你的密钥仅保存在本地。",
    "help.body3":"提示：使用输入框下方的快捷提示开始。",
    "welcome":"欢迎！我是 Halya——你的向导。今天我能帮你做什么？"
  },
  ja: {
    "sidebar.newChat":"+ 新しいチャット",
    "sidebar.settings":"設定",
    "sidebar.exportAll":"すべてエクスポート",
    "sidebar.clearAll":"すべてクリア",
    "header.title":"Your Assistant",
    "header.subtitle":"euron.one 搭載 • ダークテーマ",
    "composer.placeholder":"あなたのアシスタントにメッセージ",
    "composer.send":"送信",
    "composer.attach":"ファイル添付",
    "hints.poem":"AI 詩",
    "hints.summarize":"要約",
    "hints.explain":"コード解説",
    "hints.marketing":"マーケティング案",
    "prompts.poem":"人工知能についての詩を書いてください",
    "prompts.summarize":"この文章を要約してください：",
    "prompts.explain":"このコードを説明してください：",
    "prompts.marketing":"マーケティング施策のアイデアを出してください",
    "settings.title":"設定",
    "settings.apiKey":"Euron API キー",
    "settings.keyNote":"キーはこのブラウザにのみ保存されます。",
    "settings.model":"モデル",
    "settings.temperature":"温度",
    "settings.maxTokens":"最大トークン",
    "settings.enterToSend":"Enter で送信",
    "settings.language":"言語",
    "settings.save":"保存",
    "help.title":"ようこそ",
    "help.body1":"<strong>こんにちは、Halya です。</strong> Euron アシスタントへようこそ。",
    "help.body2":"設定からキーを追加すると開始できます。キーはローカルに保存されます。",
    "help.body3":"ヒント：入力欄下のクイックプロンプトを使って始めましょう。",
    "welcome":"ようこそ！私は Halya — ガイドです。今日は何をお手伝いできますか？"
  },
  ko: {
    "sidebar.newChat":"+ 새 채팅",
    "sidebar.settings":"설정",
    "sidebar.exportAll":"모두 내보내기",
    "sidebar.clearAll":"모두 지우기",
    "header.title":"Your Assistant",
    "header.subtitle":"euron.one 기반 • 다크 테마",
    "composer.placeholder":"당신의 도우미에게 메시지",
    "composer.send":"보내기",
    "composer.attach":"파일 첨부",
    "hints.poem":"AI 시",
    "hints.summarize":"요약",
    "hints.explain":"코드 설명",
    "hints.marketing":"마케팅 아이디어",
    "prompts.poem":"인공지능에 대한 시를 작성해 주세요",
    "prompts.summarize":"이 텍스트를 요약해 주세요:",
    "prompts.explain":"이 코드를 설명해 주세요:",
    "prompts.marketing":"마케팅 캠페인 아이디어를 생성해 주세요",
    "settings.title":"설정",
    "settings.apiKey":"Euron API 키",
    "settings.keyNote":"키는 이 브라우저에만 로컬로 저장됩니다.",
    "settings.model":"모델",
    "settings.temperature":"온도",
    "settings.maxTokens":"최대 토큰",
    "settings.enterToSend":"Enter 로 전송",
    "settings.language":"언어",
    "settings.save":"저장",
    "help.title":"환영합니다",
    "help.body1":"<strong>안녕하세요, Halya 입니다.</strong> Euron 도우미에 오신 것을 환영합니다.",
    "help.body2":"설정에서 키를 추가하여 채팅을 시작하세요. 키는 로컬에만 저장됩니다.",
    "help.body3":"팁: 입력창 아래의 빠른 프롬프트를 사용해 보세요.",
    "welcome":"환영합니다! 저는 Halya — 가이드입니다. 무엇을 도와드릴까요?"
  },
  tr: {
    "sidebar.newChat":"+ Yeni sohbet",
    "sidebar.settings":"Ayarlar",
    "sidebar.exportAll":"Tümünü dışa aktar",
    "sidebar.clearAll":"Tümünü temizle",
    "header.title":"Your Assistant",
    "header.subtitle":"euron.one destekli • Koyu tema",
    "composer.placeholder":"Asistanınıza mesaj yazın",
    "composer.send":"Gönder",
    "composer.attach":"Dosya ekle",
    "hints.poem":"YZ Şiiri",
    "hints.summarize":"Özetle",
    "hints.explain":"Kodu açıkla",
    "hints.marketing":"Pazarlama Fikirleri",
    "prompts.poem":"Yapay zekâ hakkında bir şiir yaz",
    "prompts.summarize":"Bu metni özetle:",
    "prompts.explain":"Bu kodu açıkla:",
    "prompts.marketing":"Bir pazarlama kampanyası için fikirler üret",
    "settings.title":"Ayarlar",
    "settings.apiKey":"Euron API Anahtarı",
    "settings.keyNote":"Anahtarınız yalnızca bu tarayıcıda yerel olarak saklanır.",
    "settings.model":"Model",
    "settings.temperature":"Sıcaklık",
    "settings.maxTokens":"Maks. belirteç",
    "settings.enterToSend":"Enter ile gönder",
    "settings.language":"Dil",
    "settings.save":"Kaydet",
    "help.title":"Hoş geldiniz",
    "help.body1":"<strong>Merhaba, ben Halya.</strong> Euron asistanınıza hoş geldiniz.",
    "help.body2":"Başlamak için Ayarlar’dan anahtarınızı ekleyin. Anahtarınız yerel kalır.",
    "help.body3":"İpucu: Aşağıdaki hızlı önerileri kullanın.",
    "welcome":"Hoş geldiniz! Ben Halya — rehberiniz. Bugün nasıl yardımcı olabilirim?"
  },
  hi: {
    "sidebar.newChat":"+ नई बातचीत",
    "sidebar.settings":"सेटिंग्स",
    "sidebar.exportAll":"सब निर्यात करें",
    "sidebar.clearAll":"सब साफ करें",
    "header.title":"Your Assistant",
    "header.subtitle":"euron.one द्वारा संचालित • गहरा थीम",
    "composer.placeholder":"आपके सहायक को संदेश लिखें",
    "composer.send":"भेजें",
    "composer.attach":"फ़ाइल संलग्न करें",
    "hints.poem":"एआई कविता",
    "hints.summarize":"सारांश",
    "hints.explain":"कोड समझाएँ",
    "hints.marketing":"मार्केटिंग विचार",
    "prompts.poem":"कृत्रिम बुद्धिमत्ता पर एक कविता लिखें",
    "prompts.summarize":"इस पाठ का सारांश लिखें:",
    "prompts.explain":"इस कोड को समझाएँ:",
    "prompts.marketing":"मार्केटिंग अभियान के लिए विचार उत्पन्न करें",
    "settings.title":"सेटिंग्स",
    "settings.apiKey":"Euron API कुंजी",
    "settings.keyNote":"आपकी कुंजी केवल इस ब्राउज़र में स्थानीय रूप से संग्रहीत होती है।",
    "settings.model":"मॉडल",
    "settings.temperature":"टेम्परेचर",
    "settings.maxTokens":"अधिकतम टोकन",
    "settings.enterToSend":"Enter दबाकर भेजें",
    "settings.language":"भाषा",
    "settings.save":"सहेजें",
    "help.title":"स्वागत है",
    "help.body1":"<strong>नमस्ते, मैं हल्या हूँ।</strong> आपके Euron सहायक में स्वागत है।",
    "help.body2":"चैट शुरू करने के लिए सेटिंग्स में अपनी कुंजी जोड़ें। आपकी कुंजी स्थानीय रूप से संग्रहीत रहेगी।",
    "help.body3":"टिप: आरंभ करने के लिए नीचे दिए गए त्वरित सुझावों का उपयोग करें।",
    "welcome":"स्वागत है! मैं हल्या हूँ — आपकी मार्गदर्शक। आज मैं आपकी कैसे मदद कर सकती हूँ?"
  },
  ar: {
    "sidebar.newChat":"+ محادثة جديدة",
    "sidebar.settings":"الإعدادات",
    "sidebar.exportAll":"تصدير الكل",
    "sidebar.clearAll":"مسح الكل",
    "header.title":"Your Assistant",
    "header.subtitle":"مدعوم من euron.one • سمة داكنة",
    "composer.placeholder":"أرسل رسالة إلى مساعدك",
    "composer.send":"إرسال",
    "composer.attach":"إرفاق ملف",
    "hints.poem":"قصيدة الذكاء الاصطناعي",
    "hints.summarize":"تلخيص",
    "hints.explain":"شرح الكود",
    "hints.marketing":"أفكار تسويق",
    "prompts.poem":"اكتب قصيدة عن الذكاء الاصطناعي",
    "prompts.summarize":"لخّص هذا النص:",
    "prompts.explain":"اشرح هذا الكود:",
    "prompts.marketing":"أنشئ أفكارًا لحملة تسويقية",
    "settings.title":"الإعدادات",
    "settings.apiKey":"مفتاح يورون",
    "settings.keyNote":"يُخزن المفتاح محليًا في هذا المتصفح.",
    "settings.model":"النموذج",
    "settings.temperature":"درجة العشوائية",
    "settings.maxTokens":"أقصى عدد رموز",
    "settings.enterToSend":"اضغط Enter للإرسال",
    "settings.language":"اللغة",
    "settings.save":"حفظ",
    "help.title":"أهلًا وسهلًا",
    "help.body1":"<strong>مرحبًا، أنا هاليا.</strong> مساعدك المدعوم من يورون.",
    "help.body2":"افتح الإعدادات لإضافة مفتاحك والبدء. سيتم حفظه محليًا فقط.",
    "help.body3":"نصيحة: استخدم الاقتراحات أسفل حقل الإدخال للبدء.",
    "welcome":"مرحبًا! أنا هاليا — دليلك. كيف يمكنني مساعدتك اليوم؟"
  }
};

function applyLanguage(){
  const lang = state.settings.language || "en";
  const dict = I18N[lang] || I18N.en;
  document.documentElement.lang = lang;
  document.documentElement.dir = (lang === "ar") ? "rtl" : "ltr";
  // text content
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) el.textContent = dict[key];
  });
  // title attributes
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    if (dict[key]) el.title = dict[key];
  });
  // placeholder
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (dict[key]) el.placeholder = dict[key];
  });
  // data-text for hints
  document.querySelectorAll('[data-i18n-data-text]').forEach(el => {
    const key = el.getAttribute('data-i18n-data-text');
    if (dict[key]) el.setAttribute('data-text', dict[key]);
  });
  // innerHTML safe known strings
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    const key = el.getAttribute('data-i18n-html');
    if (dict[key]) el.innerHTML = dict[key];
  });
}

function getDict(){
  const lang = state.settings.language || "en";
  return I18N[lang] || I18N.en;
}

function getSystemPromptForLanguage(lang){
  const byLang = {
    en: "You are a helpful assistant. Always reply in English.",
    es: "Eres un asistente útil. Responde siempre en español.",
    fr: "Vous êtes un assistant serviable. Répondez toujours en français.",
    de: "Du bist ein hilfreicher Assistent. Antworte immer auf Deutsch.",
    pt: "Você é um assistente prestativo. Responda sempre em português.",
    it: "Sei un assistente utile. Rispondi sempre in italiano.",
    ru: "Вы полезный помощник. Всегда отвечайте по-русски.",
    zh: "你是一个有帮助的助手。请始终使用中文回复。",
    ja: "あなたは役に立つアシスタントです。常に日本語で回答してください。",
    ko: "당신은 유용한 도우미입니다. 항상 한국어로 답변하세요.",
    tr: "Faydalı bir asistansınız. Her zaman Türkçe yanıt verin.",
    hi: "आप एक सहायक सहायक हैं। हमेशा हिंदी में उत्तर दें।",
    ar: "أنت مساعد مفيد. أجب دائمًا باللغة العربية."
  };
  return byLang[lang] || byLang.en;
}

// Ensure DOM is ready before initializing
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  // DOM is already ready
  init();
}


