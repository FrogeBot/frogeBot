require("dotenv").config()
const { MessageAttachment } = require('discord.js');

delete require.cache[require.resolve("../../modules/utils.js")];
let { findImage } = require("../../modules/utils.js")

delete require.cache[require.resolve("../../modules/image.js")];
let { exec } = require("../../modules/image.js")

async function cmdFunc(msg, args) {
    try {
        let procMsg = await msg.channel.send("<a:processing:807338286753906718> Processing... This may take a minute.");
        msg.channel.startTyping()

        let imageUrl = await findImage(msg)
        let extension = imageUrl.split(".")[imageUrl.split(".").length-1].split("?")[0];

        let img = await exec(imageUrl, [ ["flip", [true, false]] ]);
        const attachment = new MessageAttachment(img, "image."+extension);
        msg.channel.stopTyping()
        msg.channel.send(attachment)
        procMsg.delete();
    } catch(e) {
        console.log(e)
        msg.channel.stopTyping()
        msg.channel.send("It broke")
    }
}

module.exports = {
    cmdFunc
}