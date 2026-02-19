const { proto } = require("baron-baileys-v2");
const { Messages } = require("../Defaults/index.js");
const { getSession, getDefaultSession } = require("../Socket/index.js");
const { phoneToJid } = require("../Utils/index.js");
const { createDelay } = require("../Utils/create-delay.js");
const { isExist } = require("../Utils/is-exist.js");
const mime = require("mime");
const { WhatsappError } = require("../Error/index.js");

const sendTextMessage = async ({
  sessionId,
  to,
  text = "",
  isGroup = false,
  ...props
}) => {
  const sid = sessionId || getDefaultSession();
  if (!sid) throw new WhatsappError("sessionId required or set default with setDefaultSession()");
  const session = getSession(sid);
  if (!session) throw new WhatsappError(Messages.sessionNotFound(sid));
  const oldPhone = to;
  to = phoneToJid({ to, isGroup });
  const isRegistered = await isExist({
    sessionId: sid,
    to,
    isGroup,
  });
  if (!isRegistered) {
    throw new WhatsappError(`${oldPhone} is not registered on Whatsapp`);
  }
  return await session.sendMessage(
    to,
    {
      text: text,
    },
    {
      quoted: props.answering,
    }
  );
};

const sendImage = async ({
  sessionId,
  to,
  text = "",
  isGroup = false,
  media,
  ...props
}) => {
  const sid = sessionId || getDefaultSession();
  if (!sid) throw new WhatsappError("sessionId required or set default with setDefaultSession()");
  const session = getSession(sid);
  if (!session) throw new WhatsappError(Messages.sessionNotFound(sid));
  const oldPhone = to;
  to = phoneToJid({ to, isGroup });
  const isRegistered = await isExist({
    sessionId: sid,
    to,
    isGroup,
  });
  if (!isRegistered) {
    throw new WhatsappError(`${oldPhone} is not registered on Whatsapp`);
  }
  if (!media)
    throw new WhatsappError("parameter media must be Buffer or String URL");
  return await session.sendMessage(
    to,
    {
      image:
        typeof media == "string"
          ? {
              url: media,
            }
          : media,
      caption: text,
    },
    {
      quoted: props.answering,
    }
  );
};

const sendVideo = async ({
  sessionId,
  to,
  text = "",
  isGroup = false,
  media,
  ...props
}) => {
  const sid = sessionId || getDefaultSession();
  if (!sid) throw new WhatsappError("sessionId required or set default with setDefaultSession()");
  const session = getSession(sid);
  if (!session) throw new WhatsappError(Messages.sessionNotFound(sid));
  const oldPhone = to;
  to = phoneToJid({ to, isGroup });
  const isRegistered = await isExist({
    sessionId: sid,
    to,
    isGroup,
  });
  if (!isRegistered) {
    throw new WhatsappError(`${oldPhone} is not registered on Whatsapp`);
  }
  if (!media)
    throw new WhatsappError("parameter media must be Buffer or String URL");
  return await session.sendMessage(
    to,
    {
      video:
        typeof media == "string"
          ? {
              url: media,
            }
          : media,
      caption: text,
    },
    {
      quoted: props.answering,
    }
  );
};

const sendDocument = async ({
  sessionId,
  to,
  text = "",
  isGroup = false,
  media,
  filename,
  ...props
}) => {
  const sid = sessionId || getDefaultSession();
  if (!sid) throw new WhatsappError("sessionId required or set default with setDefaultSession()");
  const session = getSession(sid);
  if (!session) throw new WhatsappError(Messages.sessionNotFound(sid));
  const oldPhone = to;
  to = phoneToJid({ to, isGroup });
  const isRegistered = await isExist({
    sessionId: sid,
    to,
    isGroup,
  });
  if (!isRegistered) {
    throw new WhatsappError(`${oldPhone} is not registered on Whatsapp`);
  }
  if (!media) {
    throw new WhatsappError(`Invalid Media`);
  }

  const mimetype = mime.getType(filename);
  if (!mimetype) {
    throw new WhatsappError(`Filename must include valid extension`);
  }

  return await session.sendMessage(
    to,
    {
      fileName: filename,
      document:
        typeof media == "string"
          ? {
              url: media,
            }
          : media,
      mimetype: mimetype,
      caption: text,
    },
    {
      quoted: props.answering,
    }
  );
};

const sendVoiceNote = async ({
  sessionId,
  to,
  isGroup = false,
  media,
  ...props
}) => {
  const sid = sessionId || getDefaultSession();
  if (!sid) throw new WhatsappError("sessionId required or set default with setDefaultSession()");
  const session = getSession(sid);
  if (!session) throw new WhatsappError(Messages.sessionNotFound(sid));
  const oldPhone = to;
  to = phoneToJid({ to, isGroup });
  const isRegistered = await isExist({
    sessionId: sid,
    to,
    isGroup,
  });
  if (!isRegistered) {
    throw new WhatsappError(`${oldPhone} is not registered on Whatsapp`);
  }
  if (!media) {
    throw new WhatsappError(`Invalid Media`);
  }

  return await session.sendMessage(
    to,
    {
      audio:
        typeof media == "string"
          ? {
              url: media,
            }
          : media,
      ptt: true,
    },
    {
      quoted: props.answering,
    }
  );
};

const sendSticker = async ({
  sessionId,
  to,
  isGroup,
  media,
  ...props
}) => {
  const sid = sessionId || getDefaultSession();
  if (!sid) throw new WhatsappError("sessionId required or set default with setDefaultSession()");
  const session = getSession(sid);
  if (!session) throw new WhatsappError(Messages.sessionNotFound(sid));
  const oldPhone = to;
  to = phoneToJid({ to, isGroup });
  const isRegistered = await isExist({
    sessionId: sid,
    to,
    isGroup,
  });
  if (!isRegistered) {
    throw new WhatsappError(`${oldPhone} is not registered on Whatsapp`);
  }
  if (!media) {
    throw new WhatsappError(`Invalid Media`);
  }

  return await session.sendMessage(
    to,
    {
      sticker:
        typeof media == "string"
          ? {
              url: media,
            }
          : media,
    },
    {
      quoted: props.answering,
    }
  );
};

/**
 * Give typing effect to target
 *
 * Looks like human typing
 *
 * @param sessionId - Session ID (optional if default set)
 * @param to - Target
 * @param duration - Duration in miliseconds typing effect will appear
 */
const sendTyping = async ({
  sessionId,
  to,
  duration = 1000,
  isGroup = false,
}) => {
  const sid = sessionId || getDefaultSession();
  if (!sid) throw new WhatsappError("sessionId required or set default with setDefaultSession()");
  const oldPhone = to;
  to = phoneToJid({ to, isGroup });
  const session = getSession(sid);
  if (!session) throw new WhatsappError(Messages.sessionNotFound(sid));
  const isRegistered = await isExist({
    sessionId: sid,
    to,
    isGroup,
  });
  if (!isRegistered) {
    throw new WhatsappError(`${oldPhone} is not registered on Whatsapp`);
  }
  await session.sendPresenceUpdate("composing", to);
  await createDelay(duration);
  await session.sendPresenceUpdate("available", to);
};

/**
 * Mark message as read
 *
 * @param sessionId - Session ID (optional if default set)
 * @param key - Message key to mark as read
 */
const readMessage = async ({ sessionId, key }) => {
  const sid = sessionId || getDefaultSession();
  if (!sid) throw new WhatsappError("sessionId required or set default with setDefaultSession()");
  const session = getSession(sid);
  if (!session) throw new WhatsappError(Messages.sessionNotFound(sid));

  await session.readMessages([key]);
};

module.exports = {
  sendTextMessage,
  sendImage,
  sendVideo,
  sendDocument,
  sendVoiceNote,
  sendSticker,
  sendTyping,
  readMessage,
};
