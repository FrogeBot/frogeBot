const { isMainThread, parentPort } = require("worker_threads");
var gm = require("gm");
if (process.env.USE_IMAGEMAGICK == "true") {
  gm = gm.subClass({ imageMagick: true });
}
let { readURL, performMethod, readBuffer, gmToBuffer } = require("./image.js");

parentPort.once("message", async (msg) => {
  if (!isMainThread) {
    try {
      let list = msg.list;
      if (msg.imgUrl) {
        let imgUrl = msg.imgUrl;
        let img = await gm(await readURL(imgUrl));
        for (let i = 0; i < list.length; i++) {
          // Loop through actions in list
          img = await performMethod(
            img,
            list[i][0],
            list[i][1],
            msg.allowBackgrounds
          ); // Perform each in succecssion
        }
        img.quality(60);
        img.format({ bufferStream: true }, function (err, format) {
          this.toBuffer(format, function (err, buffer) {
            if (!err) {
              parentPort.postMessage(buffer); // Resolve image
            } else console.log(err);
          });
        });
      } else if (msg.buffer) {
        let buffer = Buffer.from(msg.buffer);
        // Get image from buffer
        let img = await gm(buffer);
        for (let i = 0; i < list.length; i++) {
          // Loop through actions in list
          img = await performMethod(
            img,
            list[i][0],
            list[i][1],
            msg.allowBackgrounds
          ); // Perform each in succecssion
        }
        img.quality(60);
        img.format({ bufferStream: true }, function (err, format) {
          this.toBuffer(format, function (err, buffer) {
            if (!err) {
              parentPort.postMessage(buffer); // Resolve image
            } else console.log(err);
          });
        });
      }
    } catch (e) {
      console.log(e);
      parentPort.postMessage(null);
    }
  }
});
