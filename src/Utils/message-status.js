const { proto } = require("baron-baileys-v2");

const parseMessageStatusCodeToReadable = (code) => {
  if (code == proto.WebMessageInfo.Status.PENDING) return "pending";
  if (code == proto.WebMessageInfo.Status.SERVER_ACK) return "server";
  if (code == proto.WebMessageInfo.Status.DELIVERY_ACK) return "delivered";
  if (code == proto.WebMessageInfo.Status.READ) return "read";
  if (code == proto.WebMessageInfo.Status.PLAYED) return "played";

  return "error";
};

module.exports = { parseMessageStatusCodeToReadable };
