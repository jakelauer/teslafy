const WebSocket = require("ws")

let wss;
let socketMessages = [];

const initSocketLog = (isLocal, server) => {
    const port = isLocal ? 8080 : undefined;
    wss = new WebSocket.Server({
        server,
        port
    });

    console.log("Started websockets at port " + port)
}

const doMessage = (ws, messageString) => {
    ws.send(messageString);
    socketMessages.push(messageString);
    if(socketMessages.length > 50)
    {
        socketMessages.shift();
    }
}

const socketLog = (message) => {
    let messageString = typeof message === "string" ? message : JSON.stringify(message);
    console.log(message);

    wss.clients.forEach(ws => {
        doMessage(ws, messageString);
    })
}

const socketError = (message) => {
    let messageString = typeof message === "string" ? message : JSON.stringify(message);
    console.error(`ERROR: ${messageString}`);

    wss.clients.forEach(ws => {
        doMessage(ws, messageString);
    })
}

module.exports = {
    initSocketLog,
    socketLog,
    socketError,
    socketMessages
}