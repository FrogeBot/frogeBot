// TO BE WORKED ON

const { GifFrame, GifUtil, GifCodec } = require('gifwrap');
var gifFrames = require('gif-frames');
const { isMainThread, parentPort, Worker } = require('worker_threads');
let { readBuffer } = require("./image.js")
const fs = require('fs');


parentPort.once('message', async (msg) => {
    if (!isMainThread) {
        let { imgUrl, list, frameSkip, speed } = msg;
        try {
            let frames = [];
            gifFrames({ url: imgUrl, frames: 0 }).then(function (firstFrameData) {
                gifFrames({ url: imgUrl, frames: '0-29', cumulative: (firstFrameData[0].frameInfo.disposal == 1) }).then(async function (frameData) {
                    async function cb () {
                        const codec = new GifCodec();
                        codec.encodeGif(frames.filter(f => f != undefined)).then(gif => {
                            parentPort.postMessage(gif.buffer)
                        }).catch(e => {
                            console.log(e)
                            parentPort.postMessage(null)
                        });
                    }
                    let framesProcessed = 0;
                    for(let i = 0; i < frameData.length; i++) {
                        if(i%frameSkip == 0) {
                            setImmediate(() => {
                                let stream = frameData[i].getImage()
                                const chunks = [];
                                stream.on("data", function (chunk) {
                                    chunks.push(chunk);
                                });
                                // Send the buffer or you can put it into a var
                                stream.on("end", async function () {
                                    if(list == null) {
                                        let newImg = await readBuffer(Buffer.concat(chunks));
                                        let frame = new GifFrame(newImg.bitmap, { disposal: 2, delayCentisecs: Math.round(frameData[i].frameInfo.delay/speed), interlaced: frameData[i].frameInfo.interlaced })
                                        //frame.bitmap = newImg.bitmap;
                                        GifUtil.quantizeDekker(frame);
                                        frames[i] = frame;
                                        framesProcessed += frameSkip;
                                        if(framesProcessed >= frameData.length) cb()
                                    } else {
                                        let worker = new Worker(__dirname+"/image-worker.js")
                                        worker.postMessage({ buffer: Buffer.concat(chunks), list })
                            
                                        worker.on('message', async (img) => {
                                            if(img == null) reject()
                                            let newImg = await readBuffer(Buffer.from(img));
                                            let frame = new GifFrame(newImg.bitmap, { disposal: 2, delayCentisecs: Math.round(frameData[i].frameInfo.delay/speed), interlaced: frameData[i].frameInfo.interlaced })
                                            //frame.bitmap = newImg.bitmap;
                                            GifUtil.quantizeDekker(frame);
                                            frames[i] = frame;
                                            framesProcessed += frameSkip;
                                            if(framesProcessed >= frameData.length) cb()
                                        });
                                    }
                                });
                            });
                        }
                    }
                });
            });
        } catch(e) {
            console.log(e)
            parentPort.postMessage(null)
        }
    }
});