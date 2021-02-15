const { isMainThread, parentPort } = require('worker_threads');

const Discord = require('discord.js');
const client = new Discord.Client();

let ready = false;
client.on('ready', () => {
    ready = true;
    console.log(`Music client ready`);
});

client.on('error', (error) => {
    console.log(error);
});

client.login(process.env.TOKEN); // discord.js connect to discord bot

const musicCmdPath = 'music.js';
let { cmdFunc } = require('./' + musicCmdPath); // Gets function of music commands

parentPort.on('message', async (data) => {
    if (!isMainThread && ready) {
        let { msgId, channelId, args, cmd } = data;
        try {
            let channel = await client.channels.fetch(channelId);
            let msg = await channel.messages.fetch(msgId);
            setImmediate(async () => {
                cmdFunc(msg, args, cmd.action); // Runs command function
            });
        } catch (e) {
            console.log(e);
        }
    }
});

process.on('uncaughtException', function (err) {
    console.log(err);
});
