const moment = require("moment/moment")
const fs = require("fs");
const path = require("path");

let allMessages = [];
let socketMessages = [];
let filename = `../logs/log_${Date.now()}.log`;
const filePath = path.join(__dirname, filename);
fs.writeFileSync(path.join(__dirname, filename), "");

const doMessage = (messageString) => {
	const withTimestamp = `${moment().format()} // ${messageString}`;
	const lastMessage = socketMessages.length > 0 ? socketMessages[socketMessages.length - 1] : null;
	const secondToLastMessage = socketMessages.length > 1 ? socketMessages[socketMessages.length - 2] : null;

	if (lastMessage && secondToLastMessage)
	{
		const lastMsgBase = lastMessage.split(" // ")[1];
		const secLastMsgBase = secondToLastMessage.split(" // ")[1];
		const isSame = lastMsgBase === secLastMsgBase && lastMsgBase === messageString;
		if (isSame)
		{
			socketMessages.pop();
		}
	}

	allMessages.push(withTimestamp);
	socketMessages.push(withTimestamp);
	if (socketMessages.length > 50)
	{
		socketMessages.shift();
	}

	fs.appendFile(filePath, withTimestamp + "\n", function (err) {
		if (err) throw err;
		console.log('Saved!');
	});
}

const socketLog = (message, verbose) => {
	let vb = typeof verbose !== "undefined";
	let messageString = typeof message === "string" ? message : JSON.stringify(message, null, 2);
	console.log(message);
	doMessage(messageString, vb);
}

const socketError = (message, verbose) => {
	let vb = typeof verbose !== "undefined";
	let messageString = typeof message === "string" ? message : JSON.stringify(message, null, 2);
	console.error(`ERROR: ${messageString}`);
	doMessage(messageString, vb);
}

module.exports = {
	socketLog,
	socketError,
	socketMessages
}