require("dotenv").config()

function isCmd(msg) {
    delete require.cache[require.resolve("../commands/map.json")];
    let cmdMap = require("../commands/map.json")
    
    return new Promise((resolve, reject) => {
        let hasPrefix = msg.content.startsWith(process.env.CMD_PREFIX) || msg.content.startsWith("<@"+msg.client.id+">")
        if(hasPrefix) {
            let prefix = msg.content.startsWith(process.env.CMD_PREFIX) ? process.env.CMD_PREFIX : (msg.content.startsWith("<@"+msg.client.id+">") ? "<@"+msg.client.id+"> " : null)
            let cmd = msg.content.substr(prefix.length).split(" ")[0];
            if(cmdMap.hasOwnProperty(cmd)) {
                resolve(true)
            } else {
                resolve(false)
            }
        } else {
            resolve(false)
        }
    })
}
function parseMsg(msg) {
    delete require.cache[require.resolve("../commands/map.json")];
    let cmdMap = require("../commands/map.json")

    return new Promise((resolve, reject) => {
        let hasPrefix = msg.content.startsWith("+") || msg.content.startsWith("<@"+msg.client.id+">")
        if(hasPrefix) {
            let prefix = msg.content.startsWith(process.env.CMD_PREFIX) ? process.env.CMD_PREFIX : (msg.content.startsWith("<@"+msg.client.id+">") ? "<@"+msg.client.id+"> " : null)
            let cmd = msg.content.substr(prefix.length).split(" ")[0];
            if(cmdMap.hasOwnProperty(cmd)) {
                let args = msg.content.substr(prefix.length + cmd.length + 1)
                resolve([prefix, cmd, args])
            } else {
                reject()
            }
        } else {
            reject()
        }
    })
}

function getCmdFunc(cmd) {
    delete require.cache[require.resolve("../commands/map.json")];
    let cmdMap = require("../commands/map.json")

    return new Promise((resolve, reject) => {
        if(cmdMap.hasOwnProperty(cmd)) {
            let script = cmdMap[cmd]
            delete require.cache[require.resolve("../commands/"+script)];
            let { cmdFunc } = require("../commands/"+script)
            resolve(cmdFunc)
        } else {
            reject()
        }
    })
}

module.exports = {
    isCmd,
    parseMsg,
    getCmdFunc
}