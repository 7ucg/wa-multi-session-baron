const { CREDENTIALS } = require("../Defaults/index.js");

const setCredentialsDir = (dirname = "wa_credentials") => {
  CREDENTIALS.DIR_NAME = dirname;
};

module.exports = { setCredentialsDir };
