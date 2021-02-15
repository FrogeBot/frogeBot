const { isMainThread, parentPort } = require('worker_threads');
var Jimp = require('jimp');
let { jimpReadURL, performMethod, readBuffer } = require('./image.js');

parentPort.once('message', async (msg) => {
    if (!isMainThread) {
        try {
            let list = msg.list;
            if (msg.imgUrl) {
                let imgUrl = msg.imgUrl;
                // Get image from URL
                jimpReadURL(imgUrl)
                    .then(async (img) => {
                        for (let i = 0; i < list.length; i++) {
                            // Loop through actions in list
                            img = await performMethod(
                                img,
                                list[i][0],
                                list[i][1],
                                msg.allowBackgrounds
                            ); // Perform each in succecssion
                        }
                        parentPort.postMessage(
                            await img.getBufferAsync(Jimp.AUTO)
                        ); // Resolve image
                    })
                    .catch((e) => {
                        console.log(e);
                        parentPort.postMessage(null);
                    });
            } else if (msg.buffer) {
                let buffer = Buffer.from(msg.buffer);
                // Get image from buffer
                readBuffer(buffer)
                    .then(async (img) => {
                        for (let i = 0; i < list.length; i++) {
                            // Loop through actions in list
                            img = await performMethod(
                                img,
                                list[i][0],
                                list[i][1],
                                msg.allowBackgrounds
                            ); // Perform each in succecssion
                        }
                        parentPort.postMessage(
                            await img.getBufferAsync(Jimp.AUTO)
                        ); // Resolve image
                    })
                    .catch((e) => {
                        console.log(e);
                        parentPort.postMessage(null);
                    });
            }
        } catch (e) {
            console.log(e);
            parentPort.postMessage(null);
        }
    }
});
