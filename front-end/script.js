const STORAGE_KEY = "clara-chat-history-v1";
const form = document.querySelector("#chat-form");
const input = document.querySelector("#message-input");
const messagesEl = document.querySelector("#messages");
const conversation = document.querySelector("#conversation");
const welcome = document.querySelector("#welcome");
const loading = document.querySelector("#loading");
const errorEl = document.querySelector("#error-message");
const sendButton = document.querySelector("#send-button");
let messages = loadHistory();
let sending = false;

function loadHistory() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved.filter((item) => item && ["user", "assistant"].includes(item.sender) && typeof item.text === "string") : [];
  } catch { return []; }
}

function saveHistory() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages)); }
  catch { showError("Não foi possível salvar o histórico neste navegador."); }
}

function formatTime(timestamp) {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(timestamp));
}

function renderMessage(message) {
  const row = document.createElement("article");
  row.className = `message-row ${message.sender}`;
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = message.text;
  const time = document.createElement("time");
  time.className = "message-time";
  time.dateTime = message.timestamp;
  time.textContent = formatTime(message.timestamp);
  row.append(bubble, time);
  messagesEl.append(row);
}

function renderAll() {
  messagesEl.replaceChildren();
  messages.forEach(renderMessage);
  welcome.hidden = messages.length > 0;
  scrollToLatest();
}

function scrollToLatest() {
  conversation.scrollTo({ top: conversation.scrollHeight, behavior: "smooth" });
}

function addMessage(sender, text) {
  const message = { id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`, sender, text, timestamp: new Date().toISOString() };
  messages.push(message);
  welcome.hidden = true;
  renderMessage(message);
  saveHistory();
  scrollToLatest();
}

function showError(text) {
  errorEl.textContent = text;
  errorEl.hidden = false;
}

function clearError() { errorEl.textContent = ""; errorEl.hidden = true; }

async function sendMessage(text) {
  const message = text.trim();
  if (!message || sending) return;
  sending = true;
  clearError();
  input.value = "";
  resizeInput();
  addMessage("user", message);
  loading.hidden = false;
  sendButton.disabled = true;
  scrollToLatest();

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.error || "Não foi possível enviar sua mensagem. Tente novamente.");
    if (typeof data?.reply !== "string" || !data.reply.trim()) throw new Error("O assistente retornou uma resposta vazia. Tente novamente.");
    addMessage("assistant", data.reply.trim());
  } catch (error) {
    showError(error instanceof TypeError ? "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente." : error.message);
  } finally {
    loading.hidden = true;
    sendButton.disabled = false;
    sending = false;
    input.focus();
    scrollToLatest();
  }
}

function resizeInput() {
  input.style.height = "auto";
  input.style.height = `${Math.min(input.scrollHeight, 112)}px`;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  sendMessage(input.value);
});
input.addEventListener("input", resizeInput);
input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});
document.querySelector("#clear-chat").addEventListener("click", () => {
  messages = [];
  messagesEl.replaceChildren();
  welcome.hidden = false;
  clearError();
  localStorage.removeItem(STORAGE_KEY);
  input.focus();
});
document.querySelectorAll(".suggestion").forEach((button) => button.addEventListener("click", () => sendMessage(button.dataset.prompt)));

renderAll();
