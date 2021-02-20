require("dotenv").config();

delete require.cache[require.resolve("../../modules/utils.js")];
let { sendImage } = require("../../modules/utils.js");

let { gmToBuffer } = require("@frogebot/image")(process.env.USE_IMAGEMAGICK)
let { canvasText } = require("../../modules/canvas.js");

var gm = require("gm");
if (process.env.USE_IMAGEMAGICK == "true") {
  gm = gm.subClass({ imageMagick: true });
}

let procMsg;
async function cmdFunc(msg, args, startTime) {
  try {
    procMsg = await msg.channel.send(process.env.MSG_PROCESSING);
    msg.channel.startTyping();

    let width = 400;
    let textCanvas = await canvasText(
      args.trim(),
      20,
      "Matoran",
      400,
      "left",
      1.25,
      "white"
    );

    textCanvas[0] = await gmToBuffer(
      gm(textCanvas[0]).crop(width, textCanvas[1])
    );

    sendImage(msg, "Matoran", startTime, textCanvas[0], "png", procMsg);
  } catch (e) {
    console.log(e);
    msg.channel.stopTyping();
    msg.channel.send({
      embed: {
        title: "Error",
        description: `<@${msg.author.id}> - ${
          imageUrl != undefined
            ? process.env.MSG_ERROR
            : process.env.MSG_NO_IMAGE
        }`,
        color: Number(process.env.EMBED_COLOUR),
        timestamp: new Date(),
        author: {
          name: process.env.BOT_NAME,
          icon_url: msg.client.user.displayAvatarURL(),
        },
      },
    });
    procMsg.delete();
  }
}

module.exports = {
  cmdFunc,
};
