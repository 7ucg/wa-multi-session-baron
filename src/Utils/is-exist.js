const { WhatsappError } = require("../Error/index.js");
const { getSession, getDefaultSession } = require("../Socket/index.js");
const { phoneToJid } = require("./phone-to-jid.js");

const isExist = async ({
  sessionId,
  to,
  isGroup = false,
}) => {
  try {
    const sid = sessionId || getDefaultSession();
    if (!sid) throw new WhatsappError("sessionId required or set default with setDefaultSession()");
    const session = getSession(sid);
    if (!session) throw new WhatsappError("Session ID Not Found!");
    const receiver = phoneToJid({
      to: to,
      isGroup: isGroup,
    });
    if (!isGroup) {
      const one = Boolean((await session?.onWhatsApp(receiver))?.[0]?.exists);
      return one;
    } else {
      return Boolean((await session.groupMetadata(receiver)).id);
    }
  } catch (error) {
    throw error;
  }
};

module.exports = { isExist };
