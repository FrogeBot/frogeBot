require("dotenv").config()
const { MessageAttachment } = require('discord.js');

delete require.cache[require.resolve("../../modules/utils.js")];
let { findImage } = require("../../modules/utils.js")

delete require.cache[require.resolve("../../modules/image.js")];
let { exec } = require("../../modules/image.js")

async function cmdFunc(msg, args) {
    try {
        msg.channel.startTyping()
        let img = await exec(await findImage(msg), [ ["greyscale", []] ]);
        const attachment = new MessageAttachment(img);
        msg.channel.stopTyping()
        msg.channel.send(attachment)
    } catch(e) {
        console.log(e)
        msg.channel.stopTyping()
        msg.channel.send("It broke")
    }
}

module.exports = {
    cmdFunc
}