class WhatsappError extends Error {
  constructor(message) {
    super(message);
    this.name = "WhatsappError";
    Object.setPrototypeOf(this, WhatsappError.prototype);
  }

  static isWhatsappError(error) {
    return error instanceof WhatsappError || error instanceof Error;
  }
}

module.exports = { WhatsappError };
