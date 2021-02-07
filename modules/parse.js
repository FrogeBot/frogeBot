require("dotenv").config()

function isCmd(msg) {
    // Uncached require command map
    delete require.cache[require.resolve("../commands/map.json")];
    let cmdMap = require("../commands/map.json")
    
    return new Promise((resolve, reject) => {
        let hasPrefix = msg.content.startsWith(process.env.CMD_PREFIX) || msg.content.startsWith("<@"+msg.client.id+">") // Check if the message has prefix
        if(hasPrefix) {
            let prefix = msg.content.startsWith(process.env.CMD_PREFIX) ? process.env.CMD_PREFIX : (msg.content.startsWith("<@"+msg.client.id+">") ? "<@"+msg.client.id+"> " : null) // Determine which prefix was used
            let cmd = msg.content.substr(prefix.length).split(" ")[0]; // Separate command
            if(cmdMap.hasOwnProperty(cmd)) {
                resolve(true) // Resolve true if is a command
            } else {
                resolve(false) // Resolve false if isn't a command
            }
        } else {
            resolve(false) // Resolve false if isn'y a command
        }
    })
}
function parseMsg(msg) {
    // Uncached require command map
    delete require.cache[require.resolve("../commands/map.json")];
    let cmdMap = require("../commands/map.json")

    return new Promise((resolve, reject) => {
        let hasPrefix = msg.content.startsWith("+") || msg.content.startsWith("<@"+msg.client.id+">") // Check if the message has prefix
        if(hasPrefix) {
            let prefix = msg.content.startsWith(process.env.CMD_PREFIX) ? process.env.CMD_PREFIX : (msg.content.startsWith("<@"+msg.client.id+">") ? "<@"+msg.client.id+"> " : null) // Determine which prefix was used
            let cmd = msg.content.substr(prefix.length).split(" ")[0]; // Separate command
            if(cmdMap.hasOwnProperty(cmd)) {
                let args = msg.content.substr(prefix.length + cmd.length + 1) // Separate args string
                resolve([prefix, cmd, args]) // Resolve data
            } else {
                reject()
            }
        } else {
            reject()
        }
    })
}

function getCmdFunc(cmd) {
    // Uncached require command map
    delete require.cache[require.resolve("../commands/map.json")];
    let cmdMap = require("../commands/map.json")

    return new Promise((resolve, reject) => {
        if(cmdMap.hasOwnProperty(cmd)) {
            let script = cmdMap[cmd] // Get command script path
            // Unchached script require
            delete require.cache[require.resolve("../commands/"+script)];
            let { cmdFunc } = require("../commands/"+script)
            resolve(cmdFunc) // Resolve command function
        } else {
            reject()
        }
    })
}

// Exports
module.exports = {
    isCmd,
    parseMsg,
    getCmdFunc
}