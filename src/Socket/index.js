
const makeWASocket = require("baron-baileys-v2").default;
const {
  default: generateWAMessageFromContent,
  getAggregateVotesInPollMessage,
  downloadContentFromMessage,
  getAggregateResponsesInEventMessage,
  normalizeMessageContent,
  getKeyAuthor,
  toNumber,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  generateWAMessage,
  makeInMemoryStore,
  DisconnectReason,
  areJidsSameUser,
  jidNormalizedUser,
  getContentType,
  decryptPollVote,
  jidDecode,
  Browsers,
  proto,
} = require("baron-baileys-v2");
const pino = require("pino");
const path = require("path");
const { Boom } = require("@hapi/boom");
const fs = require("fs");
const { CALLBACK_KEY, CREDENTIALS, Messages } = require("../Defaults/index.js");
const {
  saveDocumentHandler,
  saveImageHandler,
  saveVideoHandler,
} = require("../Utils/save-media.js");
const { WhatsappError } = require("../Error/index.js");
const { parseMessageStatusCodeToReadable } = require("../Utils/message-status.js");

const sessions = new Map();

// Callbacks als Arrays für Multi-Handler Support
const callbacks = {
  [CALLBACK_KEY.ON_MESSAGE_RECEIVED]: [],
  [CALLBACK_KEY.ON_QR]: [],
  [CALLBACK_KEY.ON_CONNECTED]: [],
  [CALLBACK_KEY.ON_DISCONNECTED]: [],
  [CALLBACK_KEY.ON_CONNECTING]: [],
  [CALLBACK_KEY.ON_MESSAGE_UPDATED]: [],
  [CALLBACK_KEY.ON_PAIRING_CODE]: [],
  [CALLBACK_KEY.ON_REACTION]: [],
  [CALLBACK_KEY.ON_GROUP_UPDATE]: [],
  [CALLBACK_KEY.ON_CALL]: [],
  [CALLBACK_KEY.ON_PRESENCE_UPDATE]: [],
};

const retryCount = new Map();

let defaultSessionId = null;

const setDefaultSession = (sessionId) => {
  if (sessionId && !getSession(sessionId)) {
    throw new WhatsappError(`Session "${sessionId}" doesn't exist. Start it first with startSession()`);
  }
  defaultSessionId = sessionId;
};

const getDefaultSession = () => defaultSessionId;

const _fireCallbacks = (key, ...args) => {
  const handlers = callbacks[key];
  if (handlers && handlers.length > 0) {
    handlers.forEach((fn) => {
      try { fn(...args); } catch (e) {}
    });
  }
};

const _addCallback = (key, listener) => {
  if (!callbacks[key]) callbacks[key] = [];
  callbacks[key].push(listener);
};

const _createSocketEventHandler = (sessionId, saveCreds) => async (events) => {
  if (events["connection.update"]) {
    const update = events["connection.update"];
    const { connection, lastDisconnect } = update;

    if (update.qr) {
      _fireCallbacks(CALLBACK_KEY.ON_QR, { sessionId, qr: update.qr });
    }

    if (connection === "connecting") {
      _fireCallbacks(CALLBACK_KEY.ON_CONNECTING, sessionId);
    }

    if (connection === "close") {
      const code = lastDisconnect?.error?.output?.statusCode;
      let retryAttempt = retryCount.get(sessionId) ?? 0;
      const shouldRetry = code !== DisconnectReason.loggedOut && retryAttempt < 10;

      if (shouldRetry) {
        retryCount.set(sessionId, retryAttempt + 1);
        // Reconnect wird von der jeweiligen startSocket-Funktion gehandhabt
      } else {
        retryCount.delete(sessionId);
        deleteSession(sessionId);
        _fireCallbacks(CALLBACK_KEY.ON_DISCONNECTED, sessionId, code);
      }
      return { shouldRetry, retryAttempt };
    }

    if (connection === "open") {
      retryCount.delete(sessionId);
      _fireCallbacks(CALLBACK_KEY.ON_CONNECTED, sessionId);
    }
  }

  if (events["creds.update"]) {
    await saveCreds();
  }

  if (events["messages.update"]) {
    for (const msg of events["messages.update"]) {
      const data = {
        sessionId,
        messageStatus: parseMessageStatusCodeToReadable(msg.update?.status),
        ...msg,
      };
      _fireCallbacks(CALLBACK_KEY.ON_MESSAGE_UPDATED, sessionId, data);
    }
  }

  if (events["messages.upsert"]) {
    for (const msg of events["messages.upsert"].messages || []) {
      msg.sessionId = sessionId;
      msg.saveImage = (filePath) => saveImageHandler(msg, filePath);
      msg.saveVideo = (filePath) => saveVideoHandler(msg, filePath);
      msg.saveDocument = (filePath) => saveDocumentHandler(msg, filePath);

      // Reaktionen separat feuern
      const reactionMsg = msg.message?.reactionMessage;
      if (reactionMsg) {
        _fireCallbacks(CALLBACK_KEY.ON_REACTION, {
          sessionId,
          reaction: reactionMsg,
          key: msg.key,
          senderJid: msg.key?.participant || msg.key?.remoteJid,
        });
      }

      _fireCallbacks(CALLBACK_KEY.ON_MESSAGE_RECEIVED, { ...msg });
    }
  }

  if (events["messages.reaction"]) {
    for (const reaction of events["messages.reaction"]) {
      _fireCallbacks(CALLBACK_KEY.ON_REACTION, { sessionId, ...reaction });
    }
  }

  if (events["groups.update"]) {
    for (const group of events["groups.update"]) {
      _fireCallbacks(CALLBACK_KEY.ON_GROUP_UPDATE, { sessionId, type: "update", ...group });
    }
  }

  if (events["group-participants.update"]) {
    _fireCallbacks(CALLBACK_KEY.ON_GROUP_UPDATE, {
      sessionId,
      type: "participants",
      ...events["group-participants.update"],
    });
  }

  if (events["call"]) {
    for (const call of events["call"]) {
      _fireCallbacks(CALLBACK_KEY.ON_CALL, { sessionId, ...call });
    }
  }

  if (events["presence.update"]) {
    _fireCallbacks(CALLBACK_KEY.ON_PRESENCE_UPDATE, {
      sessionId,
      ...events["presence.update"],
    });
  }
};

const startSession = async (
  sessionId = "mysession",
  options = {}
) => {
  if (isSessionExistAndRunning(sessionId))
    throw new WhatsappError(Messages.sessionAlreadyExist(sessionId));

  const logger = pino({ level: "silent" });
  const { version } = await fetchLatestBaileysVersion();

  const printQR = options.printQR !== false;
  const antibanConfig = options.antiban !== undefined ? options.antiban : "aggressive";

  const startSocket = async () => {
    const { state, saveCreds } = await useMultiFileAuthState(
      path.resolve(CREDENTIALS.DIR_NAME, sessionId + CREDENTIALS.PREFIX)
    );
    const sock = makeWASocket({
      version,
      printQRInTerminal: printQR,
      auth: state,
      logger,
      markOnlineOnConnect: false,
      browser: options.browser || Browsers.windows("Firefox"),
      antiban: antibanConfig,
      ...options.socketConfig,
    });
    sessions.set(sessionId, { ...sock });

    const eventHandler = _createSocketEventHandler(sessionId, saveCreds);

    sock.ev.process(async (events) => {
      const result = await eventHandler(events);
      if (result?.shouldRetry) {
        startSocket();
      }
    });

    return sock;
  };

  return startSocket();
};

const startSessionWithPairingCode = async (sessionId, options = {}) => {
  if (!options.phoneNumber) {
    throw new WhatsappError("phoneNumber ist erforderlich für Pairing-Code");
  }
  if (isSessionExistAndRunning(sessionId))
    throw new WhatsappError(Messages.sessionAlreadyExist(sessionId));

  const logger = pino({ level: "silent" });
  const { version } = await fetchLatestBaileysVersion();
  const antibanConfig = options.antiban !== undefined ? options.antiban : "aggressive";

  const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const startSocket = async () => {
    const { state, saveCreds } = await useMultiFileAuthState(
      path.resolve(CREDENTIALS.DIR_NAME, sessionId + CREDENTIALS.PREFIX)
    );
    const sock = makeWASocket({
      version,
      printQRInTerminal: false,
      auth: state,
      logger,
      markOnlineOnConnect: false,
      browser: options.browser || Browsers.windows("Firefox"),
      antiban: antibanConfig,
      ...options.socketConfig,
    });
    sessions.set(sessionId, { ...sock });

    if (!sock.authState.creds.registered) {
      await pause(1500);
      const cleanPhone = options.phoneNumber.replace(/[^\d]/g, "");
      const code = await sock.requestPairingCode(cleanPhone);
      await pause(500);
      _fireCallbacks(CALLBACK_KEY.ON_PAIRING_CODE, sessionId, code);
    }

    const eventHandler = _createSocketEventHandler(sessionId, saveCreds);

    sock.ev.process(async (events) => {
      const result = await eventHandler(events);
      if (result?.shouldRetry) {
        startSocket();
      }
    });

    return sock;
  };

  return startSocket();
};

/** @deprecated Use startSession instead */
const startWhatsapp = startSession;

const deleteSession = async (sessionId) => {
  const session = getSession(sessionId);
  try {
    await session?.logout();
  } catch (_) {}
  session?.end(undefined);
  sessions.delete(sessionId);

  if (defaultSessionId === sessionId) {
    defaultSessionId = null;
  }

  const dir = path.resolve(CREDENTIALS.DIR_NAME, sessionId + CREDENTIALS.PREFIX);
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { force: true, recursive: true });
  }
};

const getAllSession = () => Array.from(sessions.keys());

const getSession = (key) => sessions.get(key);

const isSessionExistAndRunning = (sessionId) => {
  const credDir = path.resolve(CREDENTIALS.DIR_NAME, sessionId + CREDENTIALS.PREFIX);
  return (
    fs.existsSync(credDir) &&
    fs.readdirSync(credDir).length > 0 &&
    !!getSession(sessionId)
  );
};

const shouldLoadSession = (sessionId) => {
  const credDir = path.resolve(CREDENTIALS.DIR_NAME, sessionId + CREDENTIALS.PREFIX);
  return (
    fs.existsSync(credDir) &&
    fs.readdirSync(credDir).length > 0 &&
    !getSession(sessionId)
  );
};

const loadSessionsFromStorage = (options = {}) => {
  const baseDir = path.resolve(CREDENTIALS.DIR_NAME);
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
    return;
  }
  fs.readdir(baseDir, async (err, dirs) => {
    if (err) throw err;
    for (const dir of dirs) {
      // Format: <sessionId>_credentials
      const sessionId = dir.replace(new RegExp(`${CREDENTIALS.PREFIX}$`), "");
      if (!sessionId || !shouldLoadSession(sessionId)) continue;
      startSession(sessionId, options).catch(() => {});
    }
  });
};

// ── Callback Registration ──────────────────────────────────────────────────

const onMessageReceived = (listener) => _addCallback(CALLBACK_KEY.ON_MESSAGE_RECEIVED, listener);
const onQRUpdated = (listener) => _addCallback(CALLBACK_KEY.ON_QR, listener);
const onConnected = (listener) => _addCallback(CALLBACK_KEY.ON_CONNECTED, listener);
const onDisconnected = (listener) => _addCallback(CALLBACK_KEY.ON_DISCONNECTED, listener);
const onConnecting = (listener) => _addCallback(CALLBACK_KEY.ON_CONNECTING, listener);
const onMessageUpdate = (listener) => _addCallback(CALLBACK_KEY.ON_MESSAGE_UPDATED, listener);
const onPairingCode = (listener) => _addCallback(CALLBACK_KEY.ON_PAIRING_CODE, listener);
const onReaction = (listener) => _addCallback(CALLBACK_KEY.ON_REACTION, listener);
const onGroupUpdate = (listener) => _addCallback(CALLBACK_KEY.ON_GROUP_UPDATE, listener);
const onCall = (listener) => _addCallback(CALLBACK_KEY.ON_CALL, listener);
const onPresenceUpdate = (listener) => _addCallback(CALLBACK_KEY.ON_PRESENCE_UPDATE, listener);

module.exports = {
  startSession,
  startSessionWithPairingCode,
  startWhatsapp,
  deleteSession,
  getAllSession,
  getSession,
  setDefaultSession,
  getDefaultSession,
  loadSessionsFromStorage,
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
};
