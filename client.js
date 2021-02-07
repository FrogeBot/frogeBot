require("dotenv").config() // Get .env

// Init discord.js
const Discord = require('discord.js');
const client = new Discord.Client();

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

const { parseMsg, isCmd, getCmdFunc } = require("./modules/parse.js")


client.on('message', async msg => {
    if(msg.author.bot || !await isCmd(msg)) return // If not command or called by bot

    let parsed = await parseMsg(msg); // Parses message, returns [0: Prefix, 1: Command, 2: Args string]
    let cmdFunc = await getCmdFunc(parsed[1]); // Gets function of command
    setImmediate(async () => { // Thread separation
        cmdFunc(msg, parsed[2]) // Runs command function
    });
});

client.login(process.env.TOKEN); // discord.js connect to discord bot