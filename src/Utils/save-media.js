const { downloadMediaMessage } = require("baron-baileys-v2");
const ValidationError = require("./error.js");
const fs = require("fs/promises");

const saveMedia = async (path, data) => {
  await fs.writeFile(path, data.toString("base64"), "base64");
};

const saveImageHandler = async (msg, path) => {
  if (!msg.message?.imageMessage)
    throw new ValidationError("Message is not contain Image");

  const buf = await downloadMediaMessage(msg, "buffer", {});

  return saveMedia(path, buf);
};

const saveVideoHandler = async (msg, path) => {
  if (!msg.message?.videoMessage)
    throw new ValidationError("Message is not contain Video");

  const buf = await downloadMediaMessage(msg, "buffer", {});

  return saveMedia(path, buf);
};

const saveDocumentHandler = async (msg, path) => {
  if (!msg.message?.documentMessage)
    throw new ValidationError("Message is not contain Document");

  const buf = await downloadMediaMessage(msg, "buffer", {});

  const ext = msg.message.documentMessage.fileName?.split(".").pop();
  path += "." + ext;
  return saveMedia(path, buf);
};

module.exports = { saveImageHandler, saveVideoHandler, saveDocumentHandler };
