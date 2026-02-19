# Whatsapp Multi Session - Connecting More Whatsapp Sessions in 1 App

Lightweight, pure JavaScript library for WhatsApp messaging with support for multiple sessions. Built on [baron-baileys-v2](https://www.npmjs.com/package/baron-baileys-v2). No Selenium or browser automation required.

## ✨ Features

- ✅ **Multiple Sessions** - Run 5, 10, 50+ WhatsApp bots simultaneously
- ✅ **Pure JavaScript** - No TypeScript, no build step needed
- ✅ **CommonJS** - Standard require() syntax
- ✅ **3 Usage Modes** - Choose what fits your use case
- ✅ **Direct Baileys Access** - Use raw `socket.sendMessage()` anytime
- ✅ **Media Support** - Send/receive images, videos, documents, audio
- ✅ **Message Events** - Global handler for all sessions

## Installation

```bash
npm install wa-multi-session-baron@latest
```

## Import

```javascript
const {
  MultiSessionBot,
  SessionManager,
  startSession,
  getSession,
  setDefaultSession,
} = require("wa-multi-session-baron");
```

---

## Usage Guide

### **Option 1: MultiSessionBot** (Best for 5+ Sessions)

Perfect when you need **one handler for all sessions**. Messages from ANY session go to one callback.

```javascript
const { MultiSessionBot } = require("wa-multi-session-baron");

const bot = new MultiSessionBot();

// Start multiple sessions
await bot.addSession("bot1");
await bot.addSession("bot2");
await bot.addSession("bot3");

// ONE handler for ALL sessions!
bot.onMessage(async (msg) => {
  console.log(`[${msg.sessionId}] ${msg.pushName}: ${msg.body}`);
  
  // Reply to sender with the CORRECT session automatically
  if (msg.body === "hello") {
    await msg.respond({ text: "Hi there! 👋" });
  }
  
  // Or send to any other contact with this session
  await msg.send("1234567890", { text: "Test message" });
  
  // Show typing effect
  await msg.typing(2000);
  
  // Mark as read
  await msg.read();
});

// Optional: Handle QR codes
bot.onQR((sessionId, qr) => {
  console.log(`[${sessionId}] Scan this QR:`);
  console.log(qr);
});

// Optional: Handle pairing codes (alternative to QR)
bot.onPairingCode((sessionId, code) => {
  console.log(`[${sessionId}] Pairing Code: ${code}`);
});

// Optional: Handle connection events
bot.onConnected((sessionId) => {
  console.log(`✓ ${sessionId} connected`);
});

bot.onDisconnected((sessionId) => {
  console.log(`✗ ${sessionId} disconnected`);
});
```

**Message Object Methods & Properties:**
- `msg.respond(content)` - Reply to sender with correct session
- `msg.send(jid, content)` - Send to any contact with this session
- `msg.typing(duration)` - Show typing effect
- `msg.read()` - Mark message as read
- `msg.sessionId` - Which session received this message
- `msg.socket` - Raw Baileys socket for this specific session (automatically correct for concurrent messages)

**Alternative: Use Pairing Code instead of QR**
```javascript
const bot = new MultiSessionBot();

// Start session with pairing code (no QR needed)
await bot.addSessionWithPairingCode("bot1", { phoneNumber: "1234567890" });

// Listen for pairing code
bot.onPairingCode((sessionId, code) => {
  console.log(`[${sessionId}] Pairing Code: ${code}`);
  // User inputs this code in WhatsApp when prompted
});

// Rest of the code works the same way
bot.onMessage(async (msg) => {
  console.log(`[${msg.sessionId}] ${msg.body}`);
});
```

**Note:** With 50+ sessions, use a slight delay when starting:
```javascript
for (let i = 1; i <= 50; i++) {
  await bot.addSession(`bot${i}`);
  await new Promise(r => setTimeout(r, 2000)); // 2s delay
}
```

---

### **Option 2: SessionManager** (Best for Single/Few Sessions)

Easier API for managing one session. No `sessionId` parameter needed.

```javascript
const { SessionManager } = require("wa-multi-session-baron");

// Create manager for one session
const bot = new SessionManager("mybot");

// Start session
await bot.start({ printQR: true });

// Check if active
if (bot.isActive()) {
  console.log("Bot is running!");
}

// Use convenience methods (no sessionId needed)
await bot.sendText({ to: "1234567890", text: "Hello!" });
await bot.sendImage({ to: "1234567890", media: buffer });
await bot.sendVideo({ to: "1234567890", media: buffer, text: "Watch this" });
await bot.sendDocument({ to: "1234567890", media: buffer, filename: "doc.pdf" });
await bot.sendVoiceNote({ to: "1234567890", media: buffer });
await bot.sendSticker({ to: "1234567890", media: buffer });
await bot.typing({ to: "1234567890", duration: 2000 });
await bot.readMsg(messageKey);

// Stop session
await bot.stop();
```

**Or use raw Baileys socket:**
```javascript
const bot = new SessionManager("mybot");
await bot.start();

// Access raw socket anytime
const sock = bot.socket;
// or
const sock = bot.getSocket();

// Use Baileys directly
await sock.sendMessage(jid, { text: "Raw message" });
await sock.sendMessage(jid, { image: { url: "https://..." } });
```

---

### **Option 3: Raw Baileys API** (Most Flexible)

Use the raw `getSession()` for maximum control. This is just plain Baileys!

```javascript
const {
  startSession,
  getSession,
  onMessageReceived,
  onConnected,
  onDisconnected,
} = require("wa-multi-session-baron");

// Start session
await startSession("mybot");

// Get socket (standard Baileys WASocket)
const sock = getSession("mybot");

// Use Baileys directly
await sock.sendMessage(jid, { text: "Hello!" });
await sock.sendMessage(jid, { image: { url: "https://..." } });
await sock.sendMessage(jid, { 
  video: fs.readFileSync("video.mp4"),
  caption: "Check this"
});

// Listen to events
onMessageReceived((msg) => {
  if (msg.body === "test") {
    sock.sendMessage(msg.from, { text: "Got it!" });
  }
});

onConnected((sessionId) => {
  console.log(sessionId + " is ready!");
});
```

---

### **Option 4: Default Session** (Optional Shortcut)

Set a default session so you don't need `sessionId` in every call:

```javascript
const {
  startSession,
  setDefaultSession,
  sendTextMessage,
} = require("wa-multi-session-baron");

await startSession("bot1");
setDefaultSession("bot1"); // Set as default

// Now sessionId is optional!
await sendTextMessage({
  to: "1234567890",
  text: "Hello!" // sessionId will use default
});

// Switch to another session
await startSession("bot2");
setDefaultSession("bot2");

// This goes to bot2
await sendTextMessage({
  to: "1234567890",
  text: "From bot2"
});
```

---

## API Reference

### MultiSessionBot
```javascript
bot.addSession(sessionId, options)
bot.addSessionWithPairingCode(sessionId, { phoneNumber })  // Alternative auth method
bot.removeSession(sessionId)
bot.getAllSessions()
bot.socket                        // Get raw socket of default session
bot.getSocket(sessionId)          // Get raw socket of specific session
bot.setDefaultSession(sessionId)  // Set which session is default
bot.onMessage(handler)
bot.onQR(handler)
bot.onPairingCode(handler)        // Handle pairing code from WhatsApp
bot.onConnected(handler)
bot.onDisconnected(handler)
```

### SessionManager
```javascript
bot.start(options)
bot.stop()
bot.isActive()
bot.socket
bot.getSocket()
bot.sendText({ to, text, isGroup, answering })
bot.sendImage({ to, text, media, isGroup })
bot.sendVideo({ to, text, media, isGroup })
bot.sendDocument({ to, text, media, filename, isGroup })
bot.sendVoiceNote({ to, media, isGroup })
bot.sendSticker({ to, media, isGroup })
bot.typing({ to, duration, isGroup })
bot.readMsg(key)
```

### Direct Functions
```javascript
startSession(sessionId, options)
deleteSession(sessionId)
getSession(sessionId)
getAllSession()
setDefaultSession(sessionId)
getDefaultSession()
onMessageReceived(handler)
onConnected(handler)
onDisconnected(handler)
onQRUpdated(handler)
```

---

## Examples

### Example 1: Chat Bot with 10 Sessions
```javascript
const { MultiSessionBot } = require("wa-multi-session-baron");

const bot = new MultiSessionBot();

// Start 10 bots
for (let i = 1; i <= 10; i++) {
  await bot.addSession(`bot${i}`);
  await new Promise(r => setTimeout(r, 2000));
}

// Handle all messages
bot.onMessage(async (msg) => {
  if (msg.body.toLowerCase() === "ping") {
    await msg.respond({ text: "Pong! 🏓" });
  }
});

console.log("10 bots running!");
```

### Example 2: Direct Socket Access from Message
```javascript
const { MultiSessionBot } = require("wa-multi-session-baron");

const bot = new MultiSessionBot();

await bot.addSession("bot1");
await bot.addSession("bot2");

// Access raw socket for each message correctly
bot.onMessage(async (msg) => {
  // msg.socket is always the correct socket for this message
  const sock = msg.socket;
  
  // Safe with concurrent messages - no mixing of sessions!
  await sock.sendMessage(msg.from, {
    text: "Message from session: " + msg.sessionId
  });
  
  // Works perfectly even when bot1 and bot2 get messages simultaneously
  console.log(`[${msg.sessionId}] Direct socket access works!`);
});
```

### Example 3: Auto-Reply Bot
```javascript
const { SessionManager } = require("wa-multi-session-baron");

const bot = new SessionManager("autoreply");
await bot.start();

// Listen to messages (use getSession to access listeners)
const { onMessageReceived } = require("wa-multi-session-baron");

onMessageReceived((msg) => {
  if (msg.sessionId === "autoreply" && !msg.key.fromMe) {
    bot.sendText({
      to: msg.from,
      text: `You said: ${msg.body}`
    });
  }
});
```

### Example 4: Group Manager with Raw API
```javascript
const { startSession, getSession, onMessageReceived } = require("wa-multi-session-baron");

await startSession("groupbot");
const sock = getSession("groupbot");

onMessageReceived((msg) => {
  if (msg.isGroup) {
    // Send to group
    sock.sendMessage(msg.from, { 
      text: "Thanks for the message!" 
    });
  }
});
```

---

## Configuration

### Custom Credentials Directory

By default, session data is saved in `wa_credentials/`. Change it:

```javascript
const { setCredentialsDir } = require("wa-multi-session-baron");

setCredentialsDir("./my_bot_sessions");
```

### Session Options

```javascript
await bot.addSession("mybot", {
  printQR: true  // Show QR in terminal (default: true)
});
```

---

## Media Support

### Send Media

```javascript
const fs = require("fs");

// From Buffer
const buffer = fs.readFileSync("image.jpg");
await bot.sendImage({ to: "123456", media: buffer });

// From URL
await bot.sendImage({ to: "123456", media: "https://example.com/image.jpg" });
```

### Receive Media

```javascript
bot.onMessage(async (msg) => {
  if (msg.message?.imageMessage) {
    await msg.socket.downloadAndSaveMediaMessage(msg, "image.jpg");
  }
});
```

---

## Troubleshooting

**Q: How many sessions can I run?**
A: Depends on your system RAM (~100MB per session) and network. Most people run 5-20 successfully.

**Q: Sessions keep disconnecting?**
A: WhatsApp's API might disconnect inactive sessions. Keep them active with periodic messages.

**Q: Can I use both MultiSessionBot and SessionManager together?**
A: No, use one or the other per app.

**Q: How do I get the raw Baileys socket?**
A: 
```javascript
// Option 1
const sock = bot.socket; // SessionManager

// Option 2
const sock = getSession("sessionId"); // Direct function

// Option 3
msg.socket; // From message event
```

---

## Migration from Old API

**Old way** (if upgrading):
```javascript
// Before: sessionId required everywhere
await sendTextMessage({
  sessionId: "bot1",
  to: "123456",
  text: "Hello"
});
```

**New way** (options):
```javascript
// Option A: Use default session
setDefaultSession("bot1");
await sendTextMessage({ to: "123456", text: "Hello" });

// Option B: Use MultiSessionBot (recommended)
const bot = new MultiSessionBot();
await bot.addSession("bot1");
bot.onMessage(async (msg) => {
  await msg.respond({ text: "Hello" });
});

// Option C: Use raw socket (most flexible)
const sock = getSession("bot1");
await sock.sendMessage(jid, { text: "Hello" });
```

---

## License

MIT - See LICENSE file

## Author

[Baron](https://github.com/7ucg)

