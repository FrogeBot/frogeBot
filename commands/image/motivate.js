require("dotenv").config()
const { MessageAttachment } = require('discord.js');

delete require.cache[require.resolve("../../modules/utils.js")];
let { findImage } = require("../../modules/utils.js")
var Jimp = require('jimp');

delete require.cache[require.resolve("../../modules/image.js")];
let { readURL, readBuffer, exec } = require("../../modules/image.js")
let { canvasRect, canvasText } = require("../../modules/canvas.js");
const { scale } = require("jimp");

async function cmdFunc(msg, args) {
    try {
        let procMsg = await msg.channel.send("<a:processing:807338286753906718> Processing... This may take a minute.");
        msg.channel.startTyping()

        let imageUrl = await findImage(msg)
        let extension = imageUrl.split(".")[imageUrl.split(".").length-1].split("?")[0];

        let imgFG = await readURL(imageUrl);

        
        let height = Math.round(imgFG.bitmap.height+imgFG.bitmap.width*0.05);
        let width = ( height * 4/3 > imgFG.bitmap.width*1.2 ) ? Math.round(height * 4/3) : Math.round(imgFG.bitmap.width*1.2);
        
        let scaleFactor = 0.75;
        if(height < 1024 && width < 1024) scaleFactor = 1;

        let rectCanvas = await canvasRect(Math.round(imgFG.bitmap.width*1.05), Math.round(imgFG.bitmap.height+imgFG.bitmap.width*0.05), "white", Math.round(imgFG.bitmap.width*0.005), "transparent")

        let textCanvas = await canvasText(args.split("|")[0].trim(), Math.round(width*0.1*scaleFactor), "Times New Roman", Math.round(width*0.9*scaleFactor), "center", 1.5, "white")

        let textCanvas2 = await canvasText(args.split("|").slice(1).join("|").trim(), Math.round(width*0.07*scaleFactor), "Times New Roman", Math.round(width*0.9*scaleFactor), "center", 1.5, "white")

        let offset = textCanvas[1]/scaleFactor+textCanvas2[1]/scaleFactor + width*0.05;

        let img = await exec(imageUrl, [
            ["addBackground", [width, height+offset, "#000000", Math.round(width/2-imgFG.bitmap.width/2), Math.round(width*0.05)] ],
            ["composite", [rectCanvas, Math.round(width/2-imgFG.bitmap.width/2 - Math.round(imgFG.bitmap.width*0.025)), Math.round(width*0.05 - imgFG.bitmap.width*0.025)]],
            ["scale", [scaleFactor]],
            ["composite", [textCanvas[0], Math.round(width*0.05*scaleFactor), Math.round(height*scaleFactor + width*0.05 - imgFG.bitmap.width*0.025)]],
            ["composite", [textCanvas2[0], Math.round(width*0.05*scaleFactor), Math.round(height*scaleFactor + width*0.05 - imgFG.bitmap.width*0.025)+textCanvas[1]]]
        ]).catch(e => {
            throw e
        });
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