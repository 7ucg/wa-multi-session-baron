// Type definitions as comments for documentation purposes
// These are primarily used as type hints in TypeScript IDE support
// In JavaScript, interface definitions are not needed at runtime

/*
interface SendMessageTypes {
  to: string | number;
  text?: string;
  sessionId: string;
  isGroup?: boolean;
  answering?: proto.IWebMessageInfo;
}

interface SendMediaTypes extends SendMessageTypes {
  media?: string | Buffer;
}

interface SendTypingTypes extends SendMessageTypes {
  duration: number;
}

interface SendReadTypes {
  sessionId: string;
  key: proto.IMessageKey;
}

interface MessageReceived extends proto.IWebMessageInfo {
  sessionId: string;
  saveImage: (path: string) => Promise<void>;
  saveVideo: (path: string) => Promise<void>;
  saveDocument: (path: string) => Promise<void>;
}

interface StartSessionParams {
  printQR: boolean;
}

interface StartSessionWithPairingCodeParams {
  phoneNumber: string;
}

type MessageUpdated = WAMessageUpdate & {
  sessionId: string;
  messageStatus: "error" | "pending" | "server" | "delivered" | "read" | "played";
};
*/

module.exports = {};
