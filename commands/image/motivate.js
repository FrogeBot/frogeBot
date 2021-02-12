require("dotenv").config()

delete require.cache[require.resolve("../../modules/utils.js")];
let { findImage, sendImage } = require("../../modules/utils.js")

delete require.cache[require.resolve("../../modules/image.js")];
let { jimpReadURL, exec } = require("../../modules/image.js")
let { canvasText, canvasWindow } = require("../../modules/canvas.js");

let procMsg
let imageUrl
async function cmdFunc(msg, args, startTime) {
    try {
        procMsg = await msg.channel.send(process.env.MSG_PROCESSING);
        msg.channel.startTyping()

        imageUrl = await findImage(msg)
        let extension = imageUrl.split(".")[imageUrl.split(".").length-1].split("?")[0];

        let imgFG = await jimpReadURL(imageUrl);

        
        let height = Math.round(imgFG.bitmap.height+imgFG.bitmap.width*0.05);
        let width = ( height * 4/3 > imgFG.bitmap.width*1.2 ) ? Math.round(height * 4/3) : Math.round(imgFG.bitmap.width*1.2);

        let x = Math.round(width/2-imgFG.bitmap.width/2);
        let y = Math.round(width*0.05)

        let textCanvas = await canvasText(args.split("|")[0].trim(), Math.round(width*0.1), "Times New Roman", Math.round(width*0.9), "center", 1.5, "white")
        let textCanvas2 = await canvasText(args.split("|").slice(1).join("|").trim(), Math.round(width*0.07), "Times New Roman", Math.round(width*0.9), "center", 1.5, "white")

        let offset = textCanvas[1]+textCanvas2[1] + width*0.05;

        let windowCanvas = await canvasWindow(width, height+offset, x, y, imgFG.bitmap.width, imgFG.bitmap.height, "white", Math.ceil(imgFG.bitmap.width*0.005), Math.ceil(width*0.025 - imgFG.bitmap.width*0.0125), "black")

        let img = await exec(imageUrl, [
            ["addBackground", [width, height+offset, "#000000", x, y] ],
            ["composite", [windowCanvas, 0, 0]],
            ["composite", [textCanvas[0], Math.round(width*0.05), Math.round(height + width*0.05 - imgFG.bitmap.width*0.025)]],
            ["composite", [textCanvas2[0], Math.round(width*0.05), Math.round(height + width*0.05 - imgFG.bitmap.width*0.025)+textCanvas[1]]]
        ])
        
        sendImage(msg, "Motivate", startTime, img, extension, procMsg)
    } catch(e) {
        console.log(e)
        msg.channel.stopTyping()
        msg.channel.send({
            embed: {
                "title": "Error",
                "description": `<@${msg.author.id}> - ${ imageUrl != undefined ? process.env.MSG_ERROR : process.env.MSG_NO_IMAGE}`,
                "color": Number(process.env.EMBED_COLOUR),
                "timestamp": new Date(),
                "author": {
                    "name": process.env.BOT_NAME,
                    "icon_url": msg.client.user.displayAvatarURL()
                }
            }
        })
        procMsg.delete();
    }
}

module.exports = {
    cmdFunc
}