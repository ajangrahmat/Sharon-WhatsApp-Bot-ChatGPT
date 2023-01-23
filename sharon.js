// dependencies declaration and initialization
const {
  default: makeWASocket,
  DisconnectReason,
  useSingleFileAuthState,
} = require("@adiwajshing/baileys");
const chalk = require("chalk");
const { Boom } = require("@hapi/boom");
const { state, saveState } = useSingleFileAuthState("./auth_info.json");

// Array of bot nicknames and Contain function
var botNickname = ["sharon", "mina", "@6282126083338"];
function contains(target, pattern) {
  var value = 0;
  pattern.forEach(function (word) {
    value = value + target.includes(word);
  });
  return value === 1;
}

// connect to WhatsApp function
async function connectToWhatsApp() {
  // create a new WhatsApp socket
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    defaultQueryTimeoutMs: undefined,
  });

  // listen for connection updates
  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "close") {
      const shouldReconnect =
        (lastDisconnect.error = Boom)?.output?.statusCode !==
        DisconnectReason.loggedOut;
      console.log(
        "connection closed due to ",
        lastDisconnect.error,
        ", reconnecting ",
        shouldReconnect
      );
      if (shouldReconnect) {
        connectToWhatsApp();
      }
    } else if (connection === "open") {
      console.log("opened connection");
    }
  });
  sock.ev.on("creds.update", saveState);

  // listen for new messages
  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    console.log("Message Type: ", type);
    // console.log("Messages: ", messages);

    // if the message is a new message and not from a bot
    if (type === "notify" && !messages[0].key.fromMe) {
      try {
        // get the message content
        const senderNumber = messages[0].key.remoteJid;
        const isMessageFromGroup = senderNumber.includes("@g.us");
        await sock.readMessages([messages[0].key]);
        let incomingMessages = messages[0].message.conversation;
        incomingMessages = incomingMessages.toLowerCase();
        if (incomingMessages == "") {
          incomingMessages = messages[0].message.extendedTextMessage.text;
        }
        const isMessageMentionedBot = contains(incomingMessages, botNickname);

        // print the message info to console
        console.log(chalk.green("Sender Number: ", senderNumber));
        console.log(chalk.yellow("Incoming Messages: ", incomingMessages));
        console.log(
          chalk.blueBright("Is Message From Group?: ", isMessageFromGroup)
        );
        console.log(
          chalk.greenBright(
            "Is Message Mentioned Bot?: ",
            isMessageMentionedBot
          )
        );

        // if the message is ping then reply pong
        if (incomingMessages == "ping") {
          await sock.sendMessage(
            senderNumber,
            { text: "Pong" },
            { quoted: messages[0] },
            2000
          );
          console.log(chalk.blue("Pong Sent to ", senderNumber));
        }
        //end of if
      } catch (error) {
        console.log(chalk.red(error));
      }
    }
  });
}

// start the bot
connectToWhatsApp().catch((err) => {
  console.log(chalk.red("unexpected error: " + err));
});
