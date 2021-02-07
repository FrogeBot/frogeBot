require("dotenv").config()
const { MessageAttachment } = require('discord.js');

delete require.cache[require.resolve("../../modules/utils.js")];
let { findImage } = require("../../modules/utils.js")
var Jimp = require('jimp');

delete require.cache[require.resolve("../../modules/image.js")];
let { readURL, readBuffer, execNewImage } = require("../../modules/image.js")
let { canvasRect, canvasText } = require("../../modules/canvas.js");
const { scale } = require("jimp");

async function cmdFunc(msg, args) {
    try {
        let procMsg = await msg.channel.send("<a:processing:807338286753906718> Processing... This may take a minute.");
        msg.channel.startTyping()
        let imgFG = await readURL(await findImage(msg));

        
        let height = Math.round(imgFG.bitmap.height*1.2);
        let width = Math.round(height * 4/3)
        
        let scaleFactor = 0.75;
        if(height < 2000 && width < 2000) scaleFactor = 1;

        let rectCanvas = await canvasRect(Math.round(imgFG.bitmap.width*1.05), Math.round(imgFG.bitmap.height+imgFG.bitmap.width*0.05), "white", Math.round(imgFG.bitmap.width*0.005), "black")

        let textCanvas = await canvasText(args.split("|")[0].trim(), Math.round(width*0.075*scaleFactor), "Times New Roman", Math.round(width*0.9*scaleFactor), "center", 1.5, "white")

        let textCanvas2 = await canvasText(args.split("|").slice(1).join("|").trim(), Math.round(width*0.05*scaleFactor), "Times New Roman", Math.round(width*0.9*scaleFactor), "center", 1.5, "white")

        let offsetScaled = textCanvas[1]/scaleFactor+textCanvas2[1]/scaleFactor+Math.round(imgFG.bitmap.width*0.075);

        let img = await execNewImage(width, height+offset, "#000000", [
            ["composite", [rectCanvas, Math.round(width/2-imgFG.bitmap.width/2 - Math.round(imgFG.bitmap.width*0.025)), Math.round(imgFG.bitmap.height*0.05) - Math.round(imgFG.bitmap.width*0.025)]],
            ["composite", [await imgFG.getBufferAsync(Jimp.AUTO), Math.round(width/2-imgFG.bitmap.width/2), Math.round(imgFG.bitmap.height*0.05)]],
            ["scale", [scaleFactor]],
            ["composite", [textCanvas[0], Math.round(width*0.05*scaleFactor), Math.round(imgFG.bitmap.height*scaleFactor)+Math.round(imgFG.bitmap.width*0.1*scaleFactor)]],
            ["composite", [textCanvas2[0], Math.round(width*0.05*scaleFactor), Math.round(imgFG.bitmap.height*scaleFactor)+Math.round(imgFG.bitmap.width*0.175*scaleFactor)+textCanvas[1]]]
        ]).catch(e => {
            throw e
        });
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