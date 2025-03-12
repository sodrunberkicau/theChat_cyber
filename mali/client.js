const io = require("socket.io-client");
const readline = require("readline");
const crypto = require("crypto");

const socket = io("http://localhost:3005"); // port telah diubah menjadi 3005

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "> ",
});

let username = "";

socket.on("connect", () => {
  console.log("Connected to the server");

  rl.question("Enter your username: ", (input) => {
    username = input;
    console.log(`Welcome, ${username} to the chat`);
    rl.prompt();

    rl.on("line", (message) => {
      if (message.trim()) {
        const hash = crypto.createHash("sha256").update(message).digest("hex");//penambahan hash
        socket.emit("message", { username, message, hash });//sama ini 
      }
      rl.prompt();
    });
  });
});

socket.on("message", (data) => {
  const { username: senderUsername, message: senderMessage, hash: receivedHash } = data;
  const computedHash = crypto.createHash("sha256").update(senderMessage).digest("hex");//menggunakan hash sha256
  
  if (senderUsername !== username) {
    if (computedHash === receivedHash) {//pesan dienkripsi secara hash
      console.log(`${senderUsername}: ${senderMessage}`);
    } else {
      console.warn(`Warning: The message from ${senderUsername} may have been changed during transmission!`);
    }//informasi peringatan pesan telah berubah
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
