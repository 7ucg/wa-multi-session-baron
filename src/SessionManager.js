const {
  startSession,
  startSessionWithPairingCode,
  setDefaultSession,
  deleteSession,
  getSession,
  onMessageReceived,
  onQRUpdated,
  onConnected,
  onDisconnected,
  onConnecting,
  onPairingCode,
  onReaction,
  onGroupUpdate,
  onCall,
  onPresenceUpdate,
} = require("./Socket/index.js");
const {
  sendTextMessage,
  sendImage,
  sendVideo,
  sendDocument,
  sendVoiceNote,
  sendAudio,
  sendSticker,
  sendReaction,
  sendLocation,
  sendContact,
  sendTyping,
  readMessage,
  sendInteractive,
  sendAlbum,
  sendEvent,
  sendPoll,
  sendStatus,
} = require("./Messaging/index.js");

/**
 * SessionManager - Einfache Verwaltung einer einzelnen Session
 *
 * @example
 * const bot = new SessionManager("bot1");
 * await bot.start();
 * await bot.sendText({ to: "4915123456789", text: "Hallo!" });
 */
class SessionManager {
  constructor(sessionId) {
    this.sessionId = sessionId;
  }

  // ── Session ──────────────────────────────────────────────────────────────

  async start(options = { printQR: true }) {
    await startSession(this.sessionId, options);
    setDefaultSession(this.sessionId);
    return this;
  }

  async startWithPairingCode(options = {}) {
    await startSessionWithPairingCode(this.sessionId, options);
    setDefaultSession(this.sessionId);
    return this;
  }

  async stop() {
    await deleteSession(this.sessionId);
    return this;
  }

  isActive() {
    return Boolean(getSession(this.sessionId));
  }

  getSocket() {
    const sock = getSession(this.sessionId);
    if (!sock) throw new Error(`Session "${this.sessionId}" not active`);
    return sock;
  }

  get socket() {
    return this.getSocket();
  }

  // ── Event Handler ────────────────────────────────────────────────────────

  onMessage(handler) {
    onMessageReceived((msg) => {
      if (msg.sessionId !== this.sessionId) return;
      const sock = getSession(this.sessionId);
      if (!sock) return;
      handler({
        ...msg,
        socket: sock,
        async respond(content) {
          return sock.sendMessage(msg.key?.remoteJid || msg.from, content, { quoted: msg });
        },
        async typing(duration = 1500) {
          const jid = msg.key?.remoteJid || msg.from;
          await sock.sendPresenceUpdate("composing", jid);
          await new Promise((r) => setTimeout(r, duration));
          await sock.sendPresenceUpdate("available", jid);
        },
        async read() { await sock.readMessages([msg.key]); },
        async react(emoji) {
          return sock.sendMessage(msg.key?.remoteJid || msg.from, {
            react: { text: emoji, key: msg.key },
          });
        },
      });
    });
    return this;
  }

  onQR(handler) {
    onQRUpdated(({ sessionId, qr }) => {
      if (sessionId === this.sessionId) handler(qr);
    });
    return this;
  }

  onConnected(handler) {
    onConnected((sessionId) => {
      if (sessionId === this.sessionId) handler();
    });
    return this;
  }

  onDisconnected(handler) {
    onDisconnected((sessionId, code) => {
      if (sessionId === this.sessionId) handler(code);
    });
    return this;
  }

  onPairingCode(handler) {
    onPairingCode((sessionId, code) => {
      if (sessionId === this.sessionId) handler(code);
    });
    return this;
  }

  onConnecting(handler) {
    onConnecting((sessionId) => {
      if (sessionId === this.sessionId) handler();
    });
    return this;
  }

  onReaction(handler) {
    onReaction((data) => {
      if (data.sessionId === this.sessionId) handler(data);
    });
    return this;
  }

  onGroupUpdate(handler) {
    onGroupUpdate((data) => {
      if (data.sessionId === this.sessionId) handler(data);
    });
    return this;
  }

  onCall(handler) {
    onCall((data) => {
      if (data.sessionId === this.sessionId) handler(data);
    });
    return this;
  }

  onPresenceUpdate(handler) {
    onPresenceUpdate((data) => {
      if (data.sessionId === this.sessionId) handler(data);
    });
    return this;
  }

  // ── Messaging ────────────────────────────────────────────────────────────

  async sendText({ to, text = "", isGroup = false, answering }) {
    return sendTextMessage({ sessionId: this.sessionId, to, text, isGroup, answering });
  }

  async sendImage({ to, text = "", isGroup = false, media, answering }) {
    return sendImage({ sessionId: this.sessionId, to, text, isGroup, media, answering });
  }

  async sendVideo({ to, text = "", isGroup = false, media, answering }) {
    return sendVideo({ sessionId: this.sessionId, to, text, isGroup, media, answering });
  }

  async sendDocument({ to, text = "", isGroup = false, media, filename, answering }) {
    return sendDocument({ sessionId: this.sessionId, to, text, isGroup, media, filename, answering });
  }

  async sendVoiceNote({ to, isGroup = false, media, answering }) {
    return sendVoiceNote({ sessionId: this.sessionId, to, isGroup, media, answering });
  }

  async sendAudio({ to, isGroup = false, media, answering }) {
    return sendAudio({ sessionId: this.sessionId, to, isGroup, media, answering });
  }

  async sendSticker({ to, isGroup = false, media, answering }) {
    return sendSticker({ sessionId: this.sessionId, to, isGroup, media, answering });
  }

  async sendReaction({ key, emoji }) {
    return sendReaction({ sessionId: this.sessionId, key, emoji });
  }

  async sendLocation({ to, isGroup = false, latitude, longitude, name, address, answering }) {
    return sendLocation({ sessionId: this.sessionId, to, isGroup, latitude, longitude, name, address, answering });
  }

  async sendContact({ to, isGroup = false, contact, answering }) {
    return sendContact({ sessionId: this.sessionId, to, isGroup, contact, answering });
  }

  async typing({ to, isGroup = false, duration = 1000 }) {
    return sendTyping({ sessionId: this.sessionId, to, isGroup, duration });
  }

  async readMsg(key) {
    return readMessage({ sessionId: this.sessionId, key });
  }

  async sendInteractive({ to, isGroup = false, ...content }) {
    return sendInteractive({ sessionId: this.sessionId, to, isGroup, ...content });
  }

  async sendAlbum({ to, isGroup = false, album, answering }) {
    return sendAlbum({ sessionId: this.sessionId, to, isGroup, album, answering });
  }

  async sendEvent({ to, isGroup = false, event, answering }) {
    return sendEvent({ sessionId: this.sessionId, to, isGroup, event, answering });
  }

  async sendPoll({ to, isGroup = false, name, options, selectableCount, answering }) {
    return sendPoll({ sessionId: this.sessionId, to, isGroup, name, options, selectableCount, answering });
  }

  async sendStatus({ content, jids }) {
    return sendStatus({ sessionId: this.sessionId, content, jids });
  }
}

module.exports = SessionManager;
