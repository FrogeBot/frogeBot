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
        let r = (args.length > 0 && !Number.isNaN(Number(args.split(" ")[0]))) ? Number(args.split(" ")[0]) : 1.6;
        let scaleFactor = r;
        if(r < 1) scaleFactor = 1/(r*r)*2;
        let img = await exec(await findImage(msg), [ ["fisheye", [{ r }]], ["canvasScale", [1/scaleFactor]], ["scale", [scaleFactor]] ]);
        const attachment = new MessageAttachment(img);
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