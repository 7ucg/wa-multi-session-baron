
const makeWASocket = require("baron-baileys-v2").default;
const {
  default: generateWAMessageFromContent,
  getAggregateVotesInPollMessage,
  getAggregateVotesInPollMessageV2,
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
  decryptEventEdit,
  getContentType,
  decryptPollVote,
  relayMessage,
  jidDecode,
  Browsers,
  Browser,
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

const callback = new Map();

const retryCount = new Map();

let defaultSessionId = null;

// Set default session for all operations
const setDefaultSession = (sessionId) => {
  if (sessionId && !getSession(sessionId)) {
    throw new WhatsappError(`Session "${sessionId}" doesn't exist. Start it first with startSession()`);
  }
  defaultSessionId = sessionId;
};

// Get current default session
const getDefaultSession = () => defaultSessionId;

const startSession = async (
  sessionId = "mysession",
  options = { printQR: true }
) => {
  if (isSessionExistAndRunning(sessionId))
    throw new WhatsappError(Messages.sessionAlreadyExist(sessionId));
  const logger = pino({ level: "silent" });

  const { version } = await fetchLatestBaileysVersion();
  const startSocket = async () => {
    const { state, saveCreds } = await useMultiFileAuthState(
      path.resolve(CREDENTIALS.DIR_NAME, sessionId + CREDENTIALS.PREFIX)
    );
    const sock = makeWASocket({
      version,
      printQRInTerminal: options.printQR,
      auth: state,
      logger,
      markOnlineOnConnect: false,
      browser: Browsers.windows("Firefox"),
    });
    sessions.set(sessionId, { ...sock });
    try {
      sock.ev.process(async (events) => {
        if (events["connection.update"]) {
          const update = events["connection.update"];
          const { connection, lastDisconnect } = update;
          if (update.qr) {
            callback.get(CALLBACK_KEY.ON_QR)?.({
              sessionId,
              qr: update.qr,
            });
          }
          if (connection == "connecting") {
            callback.get(CALLBACK_KEY.ON_CONNECTING)?.(sessionId);
          }
          if (connection === "close") {
            const code = lastDisconnect?.error?.output?.statusCode;
            let retryAttempt = retryCount.get(sessionId) ?? 0;
            let shouldRetry;
            if (code != DisconnectReason.loggedOut && retryAttempt < 10) {
              shouldRetry = true;
            }
            if (shouldRetry) {
              retryAttempt++;
            }
            if (shouldRetry) {
              retryCount.set(sessionId, retryAttempt);
              startSocket();
            } else {
              retryCount.delete(sessionId);
              deleteSession(sessionId);
              callback.get(CALLBACK_KEY.ON_DISCONNECTED)?.(sessionId);
            }
          }
          if (connection == "open") {
            retryCount.delete(sessionId);
            callback.get(CALLBACK_KEY.ON_CONNECTED)?.(sessionId);
          }
        }
        if (events["creds.update"]) {
          await saveCreds();
        }
        if (events["messages.update"]) {
          const msg = events["messages.update"][0];
          const data = {
            sessionId: sessionId,
            messageStatus: parseMessageStatusCodeToReadable(msg.update.status),
            ...msg,
          };
          callback.get(CALLBACK_KEY.ON_MESSAGE_UPDATED)?.(sessionId, data);
        }
        if (events["messages.upsert"]) {
          const msg = events["messages.upsert"].messages?.[0];
          msg.sessionId = sessionId;
          msg.saveImage = (path) => saveImageHandler(msg, path);
          msg.saveVideo = (path) => saveVideoHandler(msg, path);
          msg.saveDocument = (path) => saveDocumentHandler(msg, path);
          callback.get(CALLBACK_KEY.ON_MESSAGE_RECEIVED)?.({
            ...msg,
          });
        }
      });
      return sock;
    } catch (error) {
      // console.log("SOCKET ERROR", error);
      return sock;
    }
  };
  return startSocket();
};

const startSessionWithPairingCode = async (
  sessionId,
  options
) => {
  if (isSessionExistAndRunning(sessionId))
    throw new WhatsappError(Messages.sessionAlreadyExist(sessionId));
  const logger = pino({ level: "silent" });

  const { version } = await fetchLatestBaileysVersion();
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
      browser: Browsers.windows("Firefox"),
    });
    sessions.set(sessionId, { ...sock });
    try {
      if (!sock.authState.creds.registered) {
        console.log("first time pairing");
        const code = await sock.requestPairingCode(options.phoneNumber);
        console.log(code);
        callback.get(CALLBACK_KEY.ON_PAIRING_CODE)?.(sessionId, code);
      }

      sock.ev.process(async (events) => {
        if (events["connection.update"]) {
          const update = events["connection.update"];
          const { connection, lastDisconnect } = update;
          if (update.qr) {
            callback.get(CALLBACK_KEY.ON_QR)?.({
              sessionId,
              qr: update.qr,
            });
          }
          if (connection == "connecting") {
            callback.get(CALLBACK_KEY.ON_CONNECTING)?.(sessionId);
          }
          if (connection === "close") {
            const code = lastDisconnect?.error?.output?.statusCode;
            let retryAttempt = retryCount.get(sessionId) ?? 0;
            let shouldRetry;
            if (code != DisconnectReason.loggedOut && retryAttempt < 10) {
              shouldRetry = true;
            }
            if (shouldRetry) {
              retryAttempt++;
            }
            if (shouldRetry) {
              retryCount.set(sessionId, retryAttempt);
              startSocket();
            } else {
              retryCount.delete(sessionId);
              deleteSession(sessionId);
              callback.get(CALLBACK_KEY.ON_DISCONNECTED)?.(sessionId);
            }
          }
          if (connection == "open") {
            retryCount.delete(sessionId);
            callback.get(CALLBACK_KEY.ON_CONNECTED)?.(sessionId);
          }
        }
        if (events["creds.update"]) {
          await saveCreds();
        }
        if (events["messages.update"]) {
          const msg = events["messages.update"][0];
          const data = {
            sessionId: sessionId,
            messageStatus: parseMessageStatusCodeToReadable(msg.update.status),
            ...msg,
          };
          callback.get(CALLBACK_KEY.ON_MESSAGE_UPDATED)?.(sessionId, data);
        }
        if (events["messages.upsert"]) {
          const msg = events["messages.upsert"].messages?.[0];
          msg.sessionId = sessionId;
          msg.saveImage = (path) => saveImageHandler(msg, path);
          msg.saveVideo = (path) => saveVideoHandler(msg, path);
          msg.saveDocument = (path) => saveDocumentHandler(msg, path);
          callback.get(CALLBACK_KEY.ON_MESSAGE_RECEIVED)?.({
            ...msg,
          });
        }
      });
      return sock;
    } catch (error) {
      // console.log("SOCKET ERROR", error);
      return sock;
    }
  };
  return startSocket();
};

/**
 * @deprecated Use startSession method instead
 */
const startWhatsapp = startSession;

const deleteSession = async (sessionId) => {
  const session = getSession(sessionId);
  try {
    await session?.logout();
  } catch (error) {}
  session?.end(undefined);
  sessions.delete(sessionId);
  const dir = path.resolve(
    CREDENTIALS.DIR_NAME,
    sessionId + CREDENTIALS.PREFIX
  );
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { force: true, recursive: true });
  }
};

const getAllSession = () => Array.from(sessions.keys());

const getSession = (key) => sessions.get(key);

const isSessionExistAndRunning = (sessionId) => {
  if (
    fs.existsSync(path.resolve(CREDENTIALS.DIR_NAME)) &&
    fs.existsSync(
      path.resolve(CREDENTIALS.DIR_NAME, sessionId + CREDENTIALS.PREFIX)
    ) &&
    fs.readdirSync(
      path.resolve(CREDENTIALS.DIR_NAME, sessionId + CREDENTIALS.PREFIX)
    ).length &&
    getSession(sessionId)
  ) {
    return true;
  }
  return false;
};

const shouldLoadSession = (sessionId) => {
  if (
    fs.existsSync(path.resolve(CREDENTIALS.DIR_NAME)) &&
    fs.existsSync(
      path.resolve(CREDENTIALS.DIR_NAME, sessionId + CREDENTIALS.PREFIX)
    ) &&
    fs.readdirSync(
      path.resolve(CREDENTIALS.DIR_NAME, sessionId + CREDENTIALS.PREFIX)
    ).length &&
    !getSession(sessionId)
  ) {
    return true;
  }
  return false;
};

const loadSessionsFromStorage = () => {
  if (!fs.existsSync(path.resolve(CREDENTIALS.DIR_NAME))) {
    fs.mkdirSync(path.resolve(CREDENTIALS.DIR_NAME));
  }
  fs.readdir(path.resolve(CREDENTIALS.DIR_NAME), async (err, dirs) => {
    if (err) {
      throw err;
    }
    for (const dir of dirs) {
      const sessionId = dir.split("_")[0];
      if (!shouldLoadSession(sessionId)) continue;
      startSession(sessionId);
    }
  });
};

const onMessageReceived = (listener) => {
  callback.set(CALLBACK_KEY.ON_MESSAGE_RECEIVED, listener);
};

const onQRUpdated = (listener) => {
  callback.set(CALLBACK_KEY.ON_QR, listener);
};

const onConnected = (listener) => {
  callback.set(CALLBACK_KEY.ON_CONNECTED, listener);
};

const onDisconnected = (listener) => {
  callback.set(CALLBACK_KEY.ON_DISCONNECTED, listener);
};

const onConnecting = (listener) => {
  callback.set(CALLBACK_KEY.ON_CONNECTING, listener);
};

const onMessageUpdate = (listener) => {
  callback.set(CALLBACK_KEY.ON_MESSAGE_UPDATED, listener);
};

const onPairingCode = (listener) => {
  callback.set(CALLBACK_KEY.ON_MESSAGE_UPDATED, listener);
};

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
};
