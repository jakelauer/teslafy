const moment = require("moment/moment")

let socketMessages = [];

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

	socketMessages.push(withTimestamp);
	if (socketMessages.length > 50)
	{
		socketMessages.shift();
	}
}

const socketLog = (message) => {
	let messageString = typeof message === "string" ? message : JSON.stringify(message, null, 2);
	console.log(message);
	doMessage(messageString);
}

const socketError = (message) => {
	let messageString = typeof message === "string" ? message : JSON.stringify(message, null, 2);
	console.error(`ERROR: ${messageString}`);
	doMessage(messageString);
}

module.exports = {
	socketLog,
	socketError,
	socketMessages
}