require("dotenv").config()

const Discord = require('discord.js');
const client = new Discord.Client();

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

const { parseMsg, isCmd, getCmdFunc } = require("./modules/parse.js")

const { Worker } = require('worker_threads')

client.on('message', async msg => {
    if(!await isCmd(msg) || msg.author.bot) return

    let parsed = await parseMsg(msg); // 0: Prefix, 1: Command, 2: Args string
    let cmdFunc = await getCmdFunc(parsed[1]);
    setImmediate(async () => {
        cmdFunc(msg, parsed[2])
    });
});

client.login(process.env.TOKEN);