"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.phoneToJid = void 0;
const Error_1 = require("../Error");
const baileys_1 = require("baron-baileys");
const isPhoneNumberValidCountry = (phone) => {
    return Object.keys(baileys_1.PHONENUMBER_MCC).some((key) => {
        return phone.startsWith(key);
    });
};
const phoneToJid = ({ to, isGroup = false, }) => {
    if (!to)
        throw new Error_1.WhatsappError('parameter "to" is required');
    let number = to.toString();
    if (!isPhoneNumberValidCountry(number)) {
        throw new Error_1.WhatsappError("phone number must start with valid country code");
    }
    if (isGroup) {
        number = number.replace(/\s|[+]|[-]/gim, "");
        if (!number.includes("@g.us"))
            number = number + "@g.us";
    }
    else {
        number = number.replace(/\s|[+]|[-]/gim, "");
        if (!number.includes("@s.whatsapp.net"))
            number = number + "@s.whatsapp.net";
    }
    return number;
};
exports.phoneToJid = phoneToJid;
