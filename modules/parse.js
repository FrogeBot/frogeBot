require("dotenv").config();

const fs = require("fs");
const YAML = require("yaml");

const commands = YAML.parse(fs.readFileSync("./commands.yml", "utf8"));

function isCmd(msg) {
  return new Promise((resolve, reject) => {
    let hasPrefix =
      msg.content.startsWith(process.env.CMD_PREFIX) ||
      msg.content.startsWith("<@" + msg.client.id + ">"); // Check if the message has prefix
    if (hasPrefix) {
      let prefix = msg.content.startsWith(process.env.CMD_PREFIX)
        ? process.env.CMD_PREFIX
        : msg.content.startsWith("<@" + msg.client.id + ">")
        ? "<@" + msg.client.id + "> "
        : null; // Determine which prefix was used
      let cmd = msg.content.substr(prefix.length).split(" ")[0]; // Separate command
      if (commands.hasOwnProperty(cmd)) {
        resolve(true); // Resolve true if is a command
      } else {
        resolve(false); // Resolve false if isn't a command
      }
    } else {
      resolve(false); // Resolve false if isn't a command
    }
  });
}
function parseMsg(msg) {
  return new Promise((resolve, reject) => {
    let hasPrefix =
      msg.content.startsWith(process.env.CMD_PREFIX) ||
      msg.content.startsWith("<@" + msg.client.id + ">"); // Check if the message has prefix
    if (hasPrefix) {
      let prefix = msg.content.startsWith(process.env.CMD_PREFIX)
        ? process.env.CMD_PREFIX
        : msg.content.startsWith("<@" + msg.client.id + ">")
        ? "<@" + msg.client.id + "> "
        : null; // Determine which prefix was used
      let cmd = msg.content.substr(prefix.length).split(" ")[0]; // Separate command
      if (commands.hasOwnProperty(cmd)) {
        let args = msg.content.substr(prefix.length + cmd.length + 1); // Separate args string
        resolve([prefix, cmd, args]); // Resolve data
      } else {
        reject();
      }
    } else {
      reject();
    }
  });
}

// Exports
module.exports = {
  isCmd,
  parseMsg,
};
