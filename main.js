const {
  default: makeWASocket,
  DisconnectReason,
  useSingleFileAuthState,
} = require("@adiwajshing/baileys");
const chalk = require("chalk");
const { Boom } = require("@hapi/boom");
const { state, saveState } = useSingleFileAuthState("./auth_info.json");

async function connectToWhatsApp() {

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    defaultQueryTimeoutMs: undefined,
  });

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "close") {
      const shouldReconnect =
        (lastDisconnect.error = Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log("connection closed due to ", lastDisconnect.error, ", reconnecting ", shouldReconnect);
      if (shouldReconnect) {
        connectToWhatsApp();
      }
    } else if (connection === "open") {
      console.log("opened connection");
    }
  });
  sock.ev.on("creds.update", saveState);

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    console.log("Message Type: ", type);
    // console.log("Messages: ", messages);
    if (type === "notify") {
      try {

        const senderNumber = messages[0].key.remoteJid;
        const isMessageFromGroup = senderNumber.includes("@g.us");
        await sock.readMessages([messages[0].key]);
        let incomingMessages = messages[0].message.conversation;
        incomingMessages = incomingMessages.toLowerCase();
        if (incomingMessages == "") {
          incomingMessages = messages[0].message.extendedTextMessage.text;
        }
        const isMessageMentionedBot = incomingMessages.includes("sharon");

        console.log(chalk.green("Sender Number: ", senderNumber));
        console.log(chalk.yellow("Incoming Messages: ", incomingMessages));
        console.log(chalk.blueBright("Is Message From Group?: ", isMessageFromGroup));
        console.log(chalk.greenBright("Is Message Mentioned Bot?: ", isMessageMentionedBot));

        if (incomingMessages == "ping") {
          await sock.sendMessage(senderNumber,{ text: "Pong"},{ quoted: messages[0] }, 2000);
          console.log(chalk.blue("Pong Sent to ", senderNumber));
        }

      } catch (error) {
        console.log(chalk.red(error));
      }

    }
  });

}

connectToWhatsApp().catch((err) => {
  console.log(chalk.red("unexpected error: " + err));
});