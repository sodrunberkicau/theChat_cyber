const http = require("http");
const socketIo = require("socket.io");
const crypto = require("crypto");

const server = http.createServer();
const io = socketIo(server);
const users = new Map();

io.on("connection", (socket) => {
  console.log(`Client ${socket.id} connected`);

  socket.emit("init", Array.from(users.entries()).map(([username, publicKey]) => ({ username, publicKey })));

  socket.on("registerPublicKey", (data) => {
    const { username, publicKey } = data;
    users.set(username, publicKey);
    console.log(`${username} registered with a public key.`);

    io.emit("newUser", { username, publicKey });
  });

  socket.on("message", (data) => {
    const { username, message, signature } = data;

    if (!users.has(username)) {
      console.warn(`⚠️ Peringatan: Pengguna ${username} tidak dikenal!`);
      return;
    }

    const publicKey = users.get(username);
    const verify = crypto.createVerify("RSA-SHA256");
    verify.update(message);
    verify.end();

    if (!verify.verify(publicKey, signature, "base64")) {
      console.warn(`⚠️ Peringatan: Pesan dari ${username} ditolak karena tanda tangan tidak valid!`);
      return;
    }

    io.emit("message", { username, message, signature });
  });

  socket.on("disconnect", () => {
    console.log(`Client ${socket.id} disconnected`);
  });
});

const port = 3005;
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
