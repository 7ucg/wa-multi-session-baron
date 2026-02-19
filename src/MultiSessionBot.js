const {
  startSession,
  startSessionWithPairingCode,
  deleteSession,
  getSession,
  setDefaultSession,
  getDefaultSession,
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
   * Neue Session hinzufügen (mit QR-Code)
   */
  async addSession(sessionId, options = { printQR: true }) {
    await startSession(sessionId, options);
    this.sessions.set(sessionId, { active: true });
    if (this.sessions.size === 1) {
      setDefaultSession(sessionId);
    }
    console.log(`✓ Session "${sessionId}" started`);
  }

  /**
   * Neue Session mit Pairing-Code hinzufügen (ohne QR)
   * @param {string} sessionId - Eindeutige ID für diese Session
   * @param {object} options - Optionen mit phoneNumber
   * @example
   * await bot.addSessionWithPairingCode("bot1", { phoneNumber: "1234567890" });
   * bot.onPairingCode((sessionId, code) => {
   *   console.log(`[${sessionId}] Pairing Code: ${code}`);
   * });
   */
  async addSessionWithPairingCode(sessionId, options = {}) {
    if (!options.phoneNumber) {
      throw new Error("phoneNumber ist erforderlich für Pairing-Code");
    }
    await startSessionWithPairingCode(sessionId, options);
    this.sessions.set(sessionId, { active: true });
    if (this.sessions.size === 1) {
      setDefaultSession(sessionId);
    }
    console.log(`✓ Session "${sessionId}" started with pairing code`);
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
   * Hole das Raw Socket einer bestimmten Session
   * @param {string} sessionId - Session ID (optional, verwendet Standard-Session wenn nicht angegeben)
   * @returns {object} Das Raw Baileys Socket Object
   * @example
   * const sock = bot.getSocket("bot1");
   * // oder mit Standard-Session:
   * const sock = bot.getSocket();
   */
  getSocket(sessionId) {
    const id = sessionId || getDefaultSession();
    if (!id) {
      throw new Error("Keine Session angegeben und keine Standard-Session gesetzt");
    }
    const sock = getSession(id);
    if (!sock) {
      throw new Error(`Socket für Session "${id}" nicht gefunden`);
    }
    return sock;
  }

  /**
   * Direkter Zugriff auf das Raw Socket der Standard-Session
   * @getter
   * @returns {object} Das Raw Baileys Socket Object
   * @example
   * const sock = bot.socket;
   */
  get socket() {
    const defaultSessionId = getDefaultSession();
    if (!defaultSessionId) {
      throw new Error("Keine Standard-Session gesetzt. Verwenden Sie bot.getSocket(sessionId) oder setzen Sie eine Standard-Session mit bot.setDefaultSession(sessionId)");
    }
    const sock = getSession(defaultSessionId);
    if (!sock) {
      throw new Error(`Socket für Standard-Session "${defaultSessionId}" nicht gefunden`);
    }
    return sock;
  }

  /**
   * Setze die Standard-Session für Socket-Zugriff
   */
  setDefaultSession(sessionId) {
    if (!this.sessions.has(sessionId)) {
      throw new Error(`Session "${sessionId}" existiert nicht`);
    }
    setDefaultSession(sessionId);
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
   * Globaler Pairing-Code-Handler
   */
  onPairingCode(handler) {
    onPairingCode((sessionId, code) => {
      handler(sessionId, code);
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
        socket: sock,

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
