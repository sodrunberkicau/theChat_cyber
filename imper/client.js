const io = require("socket.io-client");
const readline = require("readline");
const crypto = require("crypto");

const socket = io("http://localhost:3005");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "> ",
});

let registeredUsername = "";
let username = "";
const users = new Map();

// Generate RSA Key Pair
const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
  modulusLength: 2048,
});

socket.on("connect", () => {
  console.log("Connected to the server");

  rl.question("Enter your username: ", (input) => {
    username = input;
    registeredUsername = input;
    console.log(`Welcome, ${username} to the chat`);

    // Register user's public key to the server
    socket.emit("registerPublicKey", {
      username,
      publicKey: publicKey.export({ type: "spki", format: "pem" }),
    });
    
    rl.prompt();

    rl.on("line", (message) => {
      if (message.trim()) {
        if ((match = message.match(/^!impersonate (\w+)$/))) {
          username = match[1];
          console.log(`Now impersonating as ${username}`);
        } else if (message.match(/^!exit$/)) {
          username = registeredUsername;
          console.log(`Now you are ${username}`);
        } else {
          // Sign message with RSA private key
          const sign = crypto.createSign("RSA-SHA256");
          sign.update(message);
          sign.end();
          const signature = sign.sign(privateKey, "base64");

          socket.emit("message", { username, message, signature });
        }
      }
      rl.prompt();
    });
  });
});

socket.on("init", (keys) => {
  keys.forEach(([user, key]) => users.set(user, key));
  console.log(`\nThere are currently ${users.size} users in the chat`);
  rl.prompt();
});

socket.on("newUser", (data) => {
  const { username, publicKey } = data;
  users.set(username, publicKey);
  console.log(`${username} joined the chat`);
  rl.prompt();
});

socket.on("message", (data) => {
  const { username: senderUsername, message: senderMessage, signature } = data;
  
  if (!users.has(senderUsername)) {
    console.warn(`Peringatan: Pengguna ${senderUsername} ini palsu!`);
    return;
  }

  const publicKey = users.get(senderUsername);
  const verify = crypto.createVerify("RSA-SHA256");
  verify.update(senderMessage);
  verify.end();
  
  if (!verify.verify(publicKey, signature, "base64")) {
    console.warn(`Peringatan: Pengguna ${senderUsername} ini palsu!`);
    return;
  }

  if (senderUsername !== username) {
    console.log(`${senderUsername}: ${senderMessage}`);
    rl.prompt();
  }
});

socket.on("disconnect", () => {
  console.log("Server disconnected, Exiting...");
  rl.close();
  process.exit(0);
});

rl.on("SIGINT", () => {
  console.log("\nExiting...");
  socket.disconnect();
  rl.close();
  process.exit(0);
});
