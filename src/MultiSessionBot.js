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
  onReaction,
  onGroupUpdate,
  onCall,
  onPresenceUpdate,
} = require("./Socket/index.js");

/**
 * MultiSessionBot - Zentrale Verwaltung mehrerer Sessions mit globalem Handler
 *
 * @example
 * const bot = new MultiSessionBot();
 * await bot.addSession("bot1");
 * await bot.addSession("bot2");
 *
 * bot.onMessage(async (msg) => {
 *   // msg.sessionId zeigt welche Session die Nachricht empfangen hat
 *   await msg.respond({ text: "Hallo zurück!" });
 * });
 */
class MultiSessionBot {
  constructor() {
    this.sessions = new Map();
    this._setupGlobalHandlers();
  }

  // ── Session Management ───────────────────────────────────────────────────

  /**
   * Neue Session mit QR-Code hinzufügen
   * @param {string} sessionId
   * @param {object} options - { printQR, antiban, browser, socketConfig }
   */
  async addSession(sessionId, options = { printQR: true }) {
    await startSession(sessionId, options);
    this.sessions.set(sessionId, { active: true });
    if (this.sessions.size === 1) setDefaultSession(sessionId);
    console.log(`✓ Session "${sessionId}" started`);
    return this;
  }

  /**
   * Neue Session mit Pairing-Code (ohne QR)
   * @param {string} sessionId
   * @param {object} options - { phoneNumber, antiban, browser, socketConfig }
   * @example
   * await bot.addSessionWithPairingCode("bot1", { phoneNumber: "+4915123456789" });
   * bot.onPairingCode((sessionId, code) => console.log(`[${sessionId}] Code: ${code}`));
   */
  async addSessionWithPairingCode(sessionId, options = {}) {
    if (!options.phoneNumber) {
      throw new Error("phoneNumber ist erforderlich für Pairing-Code");
    }
    await startSessionWithPairingCode(sessionId, options);
    this.sessions.set(sessionId, { active: true });
    if (this.sessions.size === 1) setDefaultSession(sessionId);
    console.log(`✓ Session "${sessionId}" started with pairing code`);
    return this;
  }

  /**
   * Session entfernen
   */
  async removeSession(sessionId) {
    await deleteSession(sessionId);
    this.sessions.delete(sessionId);
    console.log(`✓ Session "${sessionId}" stopped`);
    return this;
  }

  /**
   * Alle aktiven Session-IDs
   */
  getAllSessions() {
    return Array.from(this.sessions.keys());
  }

  /**
   * Prüfe ob eine Session aktiv ist
   */
  hasSession(sessionId) {
    return this.sessions.has(sessionId) && !!getSession(sessionId);
  }

  /**
   * Raw Socket einer Session holen
   */
  getSocket(sessionId) {
    const id = sessionId || getDefaultSession();
    if (!id) throw new Error("Keine Session angegeben und keine Standard-Session gesetzt");
    const sock = getSession(id);
    if (!sock) throw new Error(`Socket für Session "${id}" nicht gefunden`);
    return sock;
  }

  /**
   * Direkter Zugriff auf das Raw Socket der Standard-Session
   */
  get socket() {
    const defaultSessionId = getDefaultSession();
    if (!defaultSessionId) throw new Error("Keine Standard-Session gesetzt");
    const sock = getSession(defaultSessionId);
    if (!sock) throw new Error(`Socket für Standard-Session "${defaultSessionId}" nicht gefunden`);
    return sock;
  }

  /**
   * Standard-Session für Socket-Zugriff setzen
   */
  setDefaultSession(sessionId) {
    if (!this.sessions.has(sessionId)) throw new Error(`Session "${sessionId}" existiert nicht`);
    setDefaultSession(sessionId);
    return this;
  }

  // ── Event Handler ────────────────────────────────────────────────────────

  /** Reagiere auf eingehende Nachrichten aller Sessions */
  onMessage(handler) {
    this._messageHandlers.push(handler);
    return this;
  }

  /** Reagiere auf QR-Updates */
  onQR(handler) {
    onQRUpdated(({ sessionId, qr }) => handler(sessionId, qr));
    return this;
  }

  /** Session verbunden */
  onConnected(handler) {
    onConnected((sessionId) => handler(sessionId));
    return this;
  }

  /** Session getrennt */
  onDisconnected(handler) {
    onDisconnected((sessionId, code) => handler(sessionId, code));
    return this;
  }

  /** Session verbindet sich */
  onConnecting(handler) {
    onConnecting((sessionId) => handler(sessionId));
    return this;
  }

  /** Pairing-Code verfügbar */
  onPairingCode(handler) {
    onPairingCode((sessionId, code) => handler(sessionId, code));
    return this;
  }

  /** Nachrichtenstatus-Updates (gelesen, gesendet, etc.) */
  onMessageStatus(handler) {
    onMessageUpdate((sessionId, data) => handler(sessionId, data));
    return this;
  }

  /**
   * Reaktionen auf Nachrichten
   * @param {function} handler - ({ sessionId, reaction, key, senderJid }) => void
   */
  onReaction(handler) {
    onReaction((data) => handler(data));
    return this;
  }

  /**
   * Gruppen-Events (Teilnehmer-Änderungen, Gruppen-Updates)
   * @param {function} handler - ({ sessionId, type, id, participants, action, ... }) => void
   */
  onGroupUpdate(handler) {
    onGroupUpdate((data) => handler(data));
    return this;
  }

  /**
   * Anruf-Events
   * @param {function} handler - ({ sessionId, id, from, status, ... }) => void
   */
  onCall(handler) {
    onCall((data) => handler(data));
    return this;
  }

  /**
   * Presence/Online-Status Updates
   * @param {function} handler - ({ sessionId, id, presences }) => void
   */
  onPresenceUpdate(handler) {
    onPresenceUpdate((data) => handler(data));
    return this;
  }

  // ── Private ──────────────────────────────────────────────────────────────

  _setupGlobalHandlers() {
    this._messageHandlers = [];

    onMessageReceived((msg) => {
      const { sessionId } = msg;
      const sock = getSession(sessionId);
      if (!sock) return;

      const wrappedMsg = {
        ...msg,
        sessionId,
        socket: sock,

        /** Antworte auf diese Nachricht mit der richtigen Session */
        async respond(content) {
          return sock.sendMessage(msg.key?.remoteJid || msg.from, content, { quoted: msg });
        },

        /** Sende Nachricht an beliebigen Kontakt mit dieser Session */
        async send(to, content) {
          return sock.sendMessage(to, content);
        },

        /** Tippen-Effekt anzeigen */
        async typing(duration = 1500) {
          const jid = msg.key?.remoteJid || msg.from;
          await sock.sendPresenceUpdate("composing", jid);
          await new Promise((r) => setTimeout(r, duration));
          await sock.sendPresenceUpdate("available", jid);
        },

        /** Markiere als gelesen */
        async read() {
          await sock.readMessages([msg.key]);
        },

        /** Reagiere auf diese Nachricht */
        async react(emoji) {
          return sock.sendMessage(msg.key?.remoteJid || msg.from, {
            react: { text: emoji, key: msg.key },
          });
        },
      };

      this._messageHandlers.forEach((handler) => {
        try { handler(wrappedMsg); } catch (e) {}
      });
    });
  }
}

module.exports = MultiSessionBot;
