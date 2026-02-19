const {
  startSession,
  deleteSession,
  getSession,
  onMessageReceived,
  onQRUpdated,
  onConnected,
  onDisconnected,
  onConnecting,
  onMessageUpdate,
  onPairingCode,
} = require("./Socket/index.js");

/**
 * MultiSessionBot - Zentrale Verwaltung mehrerer Sessions mit globalem Handler
 * 
 * @example
 * const bot = new MultiSessionBot();
 * await bot.addSession("bot1");
 * await bot.addSession("bot2");
 * 
 * bot.onMessage((msg) => {
 *   // msg.sessionId zeigt, welche Session die Nachricht empfangen hat
 *   // msg.respond() antwortet mit der richtigen Session automatisch
 *   await msg.respond({ text: "Hallo zurück!" });
 * });
 */
class MultiSessionBot {
  constructor() {
    this.sessions = new Map();
    this.messageHandlers = [];
    this.setupGlobalHandlers();
  }

  /**
   * Neue Session hinzufügen
   */
  async addSession(sessionId, options = { printQR: true }) {
    await startSession(sessionId, options);
    this.sessions.set(sessionId, { active: true });
    console.log(`✓ Session "${sessionId}" started`);
  }

  /**
   * Session entfernen
   */
  async removeSession(sessionId) {
    await deleteSession(sessionId);
    this.sessions.delete(sessionId);
    console.log(`✓ Session "${sessionId}" stopped`);
  }

  /**
   * Hole alle aktiven Sessions
   */
  getAllSessions() {
    return Array.from(this.sessions.keys());
  }

  /**
   * Globaler Message-Handler - reagiert auf Nachrichten von ALLEN Sessions
   */
  onMessage(handler) {
    this.messageHandlers.push(handler);
  }

  /**
   * Globaler QR-Handler
   */
  onQR(handler) {
    onQRUpdated(({ sessionId, qr }) => {
      handler(sessionId, qr);
    });
  }

  /**
   * Globaler Connected-Handler
   */
  onConnected(handler) {
    onConnected((sessionId) => {
      handler(sessionId);
    });
  }

  /**
   * Globaler Disconnected-Handler
   */
  onDisconnected(handler) {
    onDisconnected((sessionId) => {
      handler(sessionId);
    });
  }

  /**
   * Setup globale Handler für alle Sessions
   */
  setupGlobalHandlers() {
    onMessageReceived((msg) => {
      const { sessionId } = msg;
      const sock = getSession(sessionId);

      if (!sock) return;

      // Message wrapper mit convenience Funktionen
      const wrappedMsg = {
        ...msg,
        sessionId,

        /**
         * Antworte auf diese Nachricht mit der RICHTIGEN Session
         * @example
         * await msg.respond({ text: "Antwort!" });
         */
        async respond(content) {
          return await sock.sendMessage(msg.from, content, { quoted: msg });
        },

        /**
         * Sende Nachricht an beliebigen Kontakt mit dieser Session
         * @example
         * await msg.send("1234567890", { text: "Hallo!" });
         */
        async send(to, content) {
          return await sock.sendMessage(to, content);
        },

        /**
         * Tippen-Effekt mit dieser Session
         */
        async typing(duration = 1000) {
          await sock.sendPresenceUpdate("composing", msg.from);
          await new Promise((r) => setTimeout(r, duration));
          await sock.sendPresenceUpdate("available", msg.from);
        },

        /**
         * Markiere als gelesen
         */
        async read() {
          await sock.readMessages([msg.key]);
        },
      };

      // Alle Handler aufrufen
      this.messageHandlers.forEach((handler) => handler(wrappedMsg));
    });
  }
}

module.exports = MultiSessionBot;
