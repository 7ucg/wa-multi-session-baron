const {
  startSession,
  setDefaultSession,
  deleteSession,
  getSession,
} = require("./Socket/index.js");
const {
  sendTextMessage,
  sendImage,
  sendVideo,
  sendDocument,
  sendVoiceNote,
  sendSticker,
  sendTyping,
  readMessage,
} = require("./Messaging/index.js");

/**
 * SessionManager - Einfache Verwaltung einer einzelnen Session
 * Keine sessionId Parameter mehr nötig
 *
 * @example
 * const bot = new SessionManager("bot1");
 * await bot.start();
 * await bot.sendText({ to: "1234567890", text: "Hallo!" });
 */
class SessionManager {
  constructor(sessionId) {
    this.sessionId = sessionId;
  }

  /**
   * Starten Sie die Session
   */
  async start(options = { printQR: true }) {
    await startSession(this.sessionId, options);
    setDefaultSession(this.sessionId);
  }

  /**
   * Stoppen Sie die Session
   */
  async stop() {
    await deleteSession(this.sessionId);
  }

  /**
   * Überprüfe, ob Session aktiv ist
   */
  isActive() {
    return Boolean(getSession(this.sessionId));
  }

  /**
   * Hole die Socket-Instanz für direkten Zugriff (wie normales Baileys)
   * @returns {WASocket} Socket-Instanz
   * @example
   * const sock = bot.getSocket();
   * await sock.sendMessage(jid, { text: "Hallo!" });
   */
  getSocket() {
    const sock = getSession(this.sessionId);
    if (!sock) throw new Error(`Session "${this.sessionId}" not active`);
    return sock;
  }

  /**
   * Direkter Zugriff auf Socket als Property
   * @example
   * await bot.socket.sendMessage(jid, { text: "Hallo!" });
   */
  get socket() {
    return this.getSocket();
  }

  /**
   * Sende Nachricht
   */
  async sendText({ to, text = "", isGroup = false, answering }) {
    return await sendTextMessage({
      sessionId: this.sessionId,
      to,
      text,
      isGroup,
      answering,
    });
  }

  /**
   * Sende Bild
   */
  async sendImage({ to, text = "", isGroup = false, media, answering }) {
    return await sendImage({
      sessionId: this.sessionId,
      to,
      text,
      isGroup,
      media,
      answering,
    });
  }

  /**
   * Sende Video
   */
  async sendVideo({ to, text = "", isGroup = false, media, answering }) {
    return await sendVideo({
      sessionId: this.sessionId,
      to,
      text,
      isGroup,
      media,
      answering,
    });
  }

  /**
   * Sende Dokument
   */
  async sendDocument({ to, text = "", isGroup = false, media, filename, answering }) {
    return await sendDocument({
      sessionId: this.sessionId,
      to,
      text,
      isGroup,
      media,
      filename,
      answering,
    });
  }

  /**
   * Sende Sprachnachricht
   */
  async sendVoiceNote({ to, isGroup = false, media, answering }) {
    return await sendVoiceNote({
      sessionId: this.sessionId,
      to,
      isGroup,
      media,
      answering,
    });
  }

  /**
   * Sende Sticker
   */
  async sendSticker({ to, isGroup = false, media, answering }) {
    return await sendSticker({
      sessionId: this.sessionId,
      to,
      isGroup,
      media,
      answering,
    });
  }

  /**
   * Zeige Typing-Effekt
   */
  async typing({ to, isGroup = false, duration = 1000 }) {
    return await sendTyping({
      sessionId: this.sessionId,
      to,
      isGroup,
      duration,
    });
  }

  /**
   * Markiere Nachricht als gelesen
   */
  async readMsg(key) {
    return await readMessage({
      sessionId: this.sessionId,
      key,
    });
  }
}

module.exports = SessionManager;
