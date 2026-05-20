class CREDENTIALS {
  static DIR_NAME = "wa_credentials";
  static PREFIX = "_credentials";
}

const CALLBACK_KEY = {
  ON_MESSAGE_RECEIVED: "on-message-received",
  ON_QR: "on-qr",
  ON_CONNECTED: "on-connected",
  ON_DISCONNECTED: "on-disconnected",
  ON_CONNECTING: "on-connecting",
  ON_MESSAGE_UPDATED: "on-message-updated",
  ON_PAIRING_CODE: "on-pairing-code",
  ON_REACTION: "on-reaction",
  ON_GROUP_UPDATE: "on-group-update",
  ON_CALL: "on-call",
  ON_PRESENCE_UPDATE: "on-presence-update",
};

class Messages {
  static sessionAlreadyExist(sessionId) {
    return `Session ID :${sessionId} is already exist, Try another Session ID.`;
  }

  static sessionNotFound(sessionId) {
    return `Session with ID: ${sessionId} Not Exist!`;
  }

  static paremetersRequired(props) {
    return `Parameter ${
      typeof props == "string"
        ? props
        : props instanceof Array
        ? props.join(", ")
        : ""
    } is required`;
  }
}

module.exports = { CREDENTIALS, CALLBACK_KEY, Messages };
