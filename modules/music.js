require("dotenv").config();

// Global vars
queue = new Map();
client = undefined;

// Action functions
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

// Handle recieved function
async function cmdFunc(msg, args, action) {
  client = msg.client;
  const serverQueue = queue.get(msg.guild.id);
  if (action == "play") {
    execute(msg, serverQueue, args); // Attempt to play track
  } else if (action == "next") {
    skip(msg, serverQueue); // Skip track
  } else if (action == "stop") {
    stop(msg, serverQueue); // Stop playback
  } else if (action == "disconnect") {
    disconnect(msg, msg.guild.id); // Disconnect from vc
  } else if (action == "queue") {
    getQueue(msg, serverQueue, args); // Sends queue
  } else if (action == "nowPlaying") {
    nowPlaying(msg, serverQueue); // Sends current track
  } else if (action == "remove") {
    remove(msg, serverQueue, args); // Remove from queue
  } else if (action == "shuffle") {
    shuffle(msg, serverQueue); // Shuffle queue
  }
}

// Global prototype function for required modules
Number.prototype.durationFormat = function () {
  if (this >= 3600) {
    return new Date(this * 1000).toISOString().substr(11, 8);
  } else {
    return new Date(this * 1000).toISOString().substr(14, 5);
  }
};

// Exports
module.exports = {
  cmdFunc,
};
