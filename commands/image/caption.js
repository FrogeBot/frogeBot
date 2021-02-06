require("dotenv").config()
const { MessageAttachment } = require('discord.js');

delete require.cache[require.resolve("../../modules/utils.js")];
let { findImage } = require("../../modules/utils.js")

delete require.cache[require.resolve("../../modules/image.js")];
let { execNewImage, readURL, measureTextHeight, canvasText, readBuffer } = require("../../modules/image.js")

async function cmdFunc(msg, args) {
    try {
        let procMsg = await msg.channel.send("<a:processing:807338286753906718> Processing... This may take a minute.");
        msg.channel.startTyping()
        let imgFG = await readURL(await findImage(msg));
        let textCanvas = await canvasText(args, Math.round(imgFG.bitmap.width*0.1), "Roboto", Math.round(imgFG.bitmap.width*0.8))
        let textImg = await readBuffer(textCanvas[0]);
        let offset = textCanvas[1]+Math.round(imgFG.bitmap.width*0.1);
        let img = await execNewImage(imgFG.bitmap.width, imgFG.bitmap.height+offset, '#FFFFFF', [ ["composite", [imgFG, 0, offset]], ["composite", [textImg, Math.round(imgFG.bitmap.width*0.1), Math.round(imgFG.bitmap.width*0.05)]] ]);
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