const { WhatsappError } = require("../Error/index.js");
const { PHONENUMBER_MCC } = require("baron-baileys-v2");

const isPhoneNumberValidCountry = (phone) => {
  return Object.keys(PHONENUMBER_MCC).some((key) => {
    return phone.startsWith(key);
  });
};

const phoneToJid = ({
  to,
  isGroup = false,
}) => {
  if (!to) throw new WhatsappError('parameter "to" is required');
  let number = to.toString();
  if (!isPhoneNumberValidCountry(number)) {
    throw new WhatsappError("phone number must start with valid country code");
  }
  if (isGroup) {
    number = number.replace(/\s|[+]|[-]/gim, "");
    if (!number.includes("@g.us")) number = number + "@g.us";
  } else {
    number = number.replace(/\s|[+]|[-]/gim, "");
    if (!number.includes("@s.whatsapp.net"))
      number = number + "@s.whatsapp.net";
  }

  return number;
};

module.exports = { phoneToJid };
