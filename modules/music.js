require("dotenv").config();

queue = new Map();
client = undefined;

var {
  execute,
  skip,
  stop,
  disconnect,
  getQueue,
  nowPlaying,
  remove,
  shuffle,
} = require("./music/actions");

async function cmdFunc(msg, args, action) {
  client = msg.client;
  const serverQueue = queue.get(msg.guild.id);
  if (action == "play") {
    execute(msg, serverQueue, args);
  } else if (action == "next") {
    skip(msg, serverQueue);
  } else if (action == "stop") {
    stop(msg, serverQueue);
  } else if (action == "disconnect") {
    disconnect(msg, msg.guild.id);
  } else if (action == "queue") {
    getQueue(msg, serverQueue, args);
  } else if (action == "nowPlaying") {
    nowPlaying(msg, serverQueue);
  } else if (action == "remove") {
    remove(msg, serverQueue, args);
  } else if (action == "shuffle") {
    shuffle(msg, serverQueue);
  }
}

Number.prototype.durationFormat = function () {
  if (this >= 3600) {
    return new Date(this * 1000).toISOString().substr(11, 8);
  } else {
    return new Date(this * 1000).toISOString().substr(14, 5);
  }
};

module.exports = {
  cmdFunc,
};