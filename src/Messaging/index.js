const { proto } = require("baron-baileys-v2");
const { Messages } = require("../Defaults/index.js");
const { getSession, getDefaultSession } = require("../Socket/index.js");
const { phoneToJid } = require("../Utils/index.js");
const { createDelay } = require("../Utils/create-delay.js");
const { isExist } = require("../Utils/is-exist.js");
const mime = require("mime");
const { WhatsappError } = require("../Error/index.js");

const _resolveSession = (sessionId) => {
  const sid = sessionId || getDefaultSession();
  if (!sid) throw new WhatsappError("sessionId required or set default with setDefaultSession()");
  const session = getSession(sid);
  if (!session) throw new WhatsappError(Messages.sessionNotFound(sid));
  return { sid, session };
};

const _resolveJid = async (session, sid, to, isGroup) => {
  const oldPhone = to;
  const jid = phoneToJid({ to, isGroup });
  const registered = await isExist({ sessionId: sid, to: jid, isGroup });
  if (!registered) {
    throw new WhatsappError(`${oldPhone} is not registered on Whatsapp`);
  }
  return jid;
};

const sendTextMessage = async ({ sessionId, to, text = "", isGroup = false, ...props }) => {
  const { sid, session } = _resolveSession(sessionId);
  const jid = await _resolveJid(session, sid, to, isGroup);
  return session.sendMessage(jid, { text }, { quoted: props.answering });
};

const sendImage = async ({ sessionId, to, text = "", isGroup = false, media, ...props }) => {
  const { sid, session } = _resolveSession(sessionId);
  if (!media) throw new WhatsappError("parameter media must be Buffer or String URL");
  const jid = await _resolveJid(session, sid, to, isGroup);
  return session.sendMessage(
    jid,
    { image: typeof media === "string" ? { url: media } : media, caption: text },
    { quoted: props.answering }
  );
};

const sendVideo = async ({ sessionId, to, text = "", isGroup = false, media, ...props }) => {
  const { sid, session } = _resolveSession(sessionId);
  if (!media) throw new WhatsappError("parameter media must be Buffer or String URL");
  const jid = await _resolveJid(session, sid, to, isGroup);
  return session.sendMessage(
    jid,
    { video: typeof media === "string" ? { url: media } : media, caption: text },
    { quoted: props.answering }
  );
};

const sendDocument = async ({ sessionId, to, text = "", isGroup = false, media, filename, ...props }) => {
  const { sid, session } = _resolveSession(sessionId);
  if (!media) throw new WhatsappError("Invalid Media");
  const mimetype = mime.getType(filename);
  if (!mimetype) throw new WhatsappError("Filename must include valid extension");
  const jid = await _resolveJid(session, sid, to, isGroup);
  return session.sendMessage(
    jid,
    {
      fileName: filename,
      document: typeof media === "string" ? { url: media } : media,
      mimetype,
      caption: text,
    },
    { quoted: props.answering }
  );
};

const sendVoiceNote = async ({ sessionId, to, isGroup = false, media, ...props }) => {
  const { sid, session } = _resolveSession(sessionId);
  if (!media) throw new WhatsappError("Invalid Media");
  const jid = await _resolveJid(session, sid, to, isGroup);
  return session.sendMessage(
    jid,
    { audio: typeof media === "string" ? { url: media } : media, ptt: true },
    { quoted: props.answering }
  );
};

const sendAudio = async ({ sessionId, to, isGroup = false, media, ...props }) => {
  const { sid, session } = _resolveSession(sessionId);
  if (!media) throw new WhatsappError("Invalid Media");
  const jid = await _resolveJid(session, sid, to, isGroup);
  return session.sendMessage(
    jid,
    { audio: typeof media === "string" ? { url: media } : media, ptt: false },
    { quoted: props.answering }
  );
};

const sendSticker = async ({ sessionId, to, isGroup = false, media, ...props }) => {
  const { sid, session } = _resolveSession(sessionId);
  if (!media) throw new WhatsappError("Invalid Media");
  const jid = await _resolveJid(session, sid, to, isGroup);
  return session.sendMessage(
    jid,
    { sticker: typeof media === "string" ? { url: media } : media },
    { quoted: props.answering }
  );
};

/**
 * Sende eine Reaktion auf eine Nachricht
 * @param {string} emoji - Emoji-Reaktion (leer = Reaktion entfernen)
 * @param {object} key - Message Key auf den reagiert wird
 */
const sendReaction = async ({ sessionId, key, emoji }) => {
  const { session } = _resolveSession(sessionId);
  if (!key || !key.remoteJid) throw new WhatsappError("key.remoteJid ist erforderlich");
  return session.sendMessage(key.remoteJid, {
    react: { text: emoji || "", key },
  });
};

/**
 * Sende einen Standort
 */
const sendLocation = async ({ sessionId, to, isGroup = false, latitude, longitude, name, address, ...props }) => {
  const { sid, session } = _resolveSession(sessionId);
  if (latitude === undefined || longitude === undefined)
    throw new WhatsappError("latitude und longitude sind erforderlich");
  const jid = await _resolveJid(session, sid, to, isGroup);
  return session.sendMessage(
    jid,
    {
      location: {
        degreesLatitude: latitude,
        degreesLongitude: longitude,
        name: name || "",
        address: address || "",
      },
    },
    { quoted: props.answering }
  );
};

/**
 * Sende einen Kontakt
 * @param {object|object[]} contact - { fullName, phoneNumber } oder Array davon
 */
const sendContact = async ({ sessionId, to, isGroup = false, contact, ...props }) => {
  const { sid, session } = _resolveSession(sessionId);
  if (!contact) throw new WhatsappError("contact ist erforderlich");
  const jid = await _resolveJid(session, sid, to, isGroup);

  const contacts = Array.isArray(contact) ? contact : [contact];
  const vcards = contacts.map((c) => {
    const phone = c.phoneNumber.replace(/[^\d+]/g, "");
    return {
      displayName: c.fullName,
      vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:${c.fullName}\nTEL;type=CELL;type=VOICE;waid=${phone.replace(/^\+/, "")}:${phone}\nEND:VCARD`,
    };
  });

  return session.sendMessage(
    jid,
    contacts.length === 1
      ? { contacts: { displayName: contacts[0].fullName, contacts: vcards } }
      : { contacts: { displayName: `${contacts.length} Kontakte`, contacts: vcards } },
    { quoted: props.answering }
  );
};

/**
 * Sende eine interaktive Button-Nachricht (falls vom Server unterstützt)
 */
const sendButtons = async ({ sessionId, to, isGroup = false, text, footer, buttons, ...props }) => {
  const { sid, session } = _resolveSession(sessionId);
  if (!buttons || !Array.isArray(buttons)) throw new WhatsappError("buttons Array ist erforderlich");
  const jid = await _resolveJid(session, sid, to, isGroup);
  return session.sendMessage(
    jid,
    {
      text,
      footer,
      buttons: buttons.map((b, i) => ({
        buttonId: b.id || String(i),
        buttonText: { displayText: b.text },
        type: 1,
      })),
      headerType: 1,
    },
    { quoted: props.answering }
  );
};

/**
 * Zeige Typing-Effekt
 */
const sendTyping = async ({ sessionId, to, duration = 1000, isGroup = false }) => {
  const { sid, session } = _resolveSession(sessionId);
  const jid = phoneToJid({ to, isGroup });
  await session.sendPresenceUpdate("composing", jid);
  await createDelay(duration);
  await session.sendPresenceUpdate("available", jid);
};

/**
 * Markiere Nachrichten als gelesen
 * @param {object|object[]} key - Message Key(s)
 */
const readMessage = async ({ sessionId, key }) => {
  const { session } = _resolveSession(sessionId);
  const keys = Array.isArray(key) ? key : [key];
  await session.readMessages(keys);
};

/**
 * Sende eine interaktive Nachricht via Baron-Handler (nativeFlowMessage / interactiveMessage)
 * @param {object} content - interactiveMessage oder interactiveButtons Objekt
 */
const sendInteractive = async ({ sessionId, to, isGroup = false, ...content }) => {
  const { session } = _resolveSession(sessionId);
  const jid = phoneToJid({ to, isGroup });
  return session.sendMessage(jid, content);
};

/**
 * Sende ein Album (Bild/Video-Sammlung)
 * @param {Array} album - Array von { image|video, caption? } Objekten
 */
const sendAlbum = async ({ sessionId, to, isGroup = false, album, answering }) => {
  const { session } = _resolveSession(sessionId);
  const jid = phoneToJid({ to, isGroup });
  return session.sendMessage(jid, { albumMessage: album }, { quoted: answering });
};

/**
 * Sende ein Event
 * @param {object} event - { name, description, location, startTime, endTime, joinLink?, isCanceled?, extraGuestsAllowed? }
 */
const sendEvent = async ({ sessionId, to, isGroup = false, event, answering }) => {
  const { session } = _resolveSession(sessionId);
  if (!event?.name) throw new WhatsappError("event.name ist erforderlich");
  const jid = phoneToJid({ to, isGroup });
  return session.sendMessage(jid, { eventMessage: event }, { quoted: answering });
};

/**
 * Sende einen Poll
 * @param {string} name - Poll-Titel
 * @param {string[]} options - Antwortmöglichkeiten (2-12)
 * @param {number} selectableCount - Wie viele Optionen gewählt werden dürfen (0 = unbegrenzt)
 */
const sendPoll = async ({ sessionId, to, isGroup = false, name, options, selectableCount = 0, answering }) => {
  const { session } = _resolveSession(sessionId);
  if (!name) throw new WhatsappError("name ist erforderlich");
  if (!options || options.length < 2) throw new WhatsappError("Mindestens 2 Optionen erforderlich");
  const jid = phoneToJid({ to, isGroup });
  return session.sendMessage(
    jid,
    { poll: { name, values: options, selectableCount } },
    { quoted: answering }
  );
};

/**
 * Sende einen WhatsApp Status (Story)
 * @param {object} content - { text?, image?, video?, audio?, backgroundColor?, textColor?, font? }
 * @param {string[]} jids - Kontakte/Gruppen die den Status sehen sollen
 */
const sendStatus = async ({ sessionId, content, jids = [] }) => {
  const { session } = _resolveSession(sessionId);
  if (!session.sendStatusUpdate) throw new WhatsappError("sendStatus wird von dieser Baileys-Version nicht unterstützt");
  return session.sendStatusUpdate(content, jids);
};

module.exports = {
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
  sendButtons,
  sendTyping,
  readMessage,
  sendInteractive,
  sendAlbum,
  sendEvent,
  sendPoll,
  sendStatus,
};
