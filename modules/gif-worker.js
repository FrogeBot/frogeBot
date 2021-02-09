const { GifFrame, GifUtil, GifCodec } = require('gifwrap');
var gifFrames = require('gif-frames');
const { isMainThread, parentPort, Worker } = require('worker_threads');
let { readBuffer } = require("./image.js")
require("dotenv").config()

const os = require('os')
const cpuCount = os.cpus().length
let concurrent = 0;
let framesProcessed = 0;
let frames = [];

parentPort.once('message', async (msg) => {
    if (!isMainThread) {
        let { imgUrl, list, frameSkip, speed } = msg;
        try {
            gifFrames({ url: imgUrl, frames: 0 }).then(function (firstFrameData) {
                gifFrames({ url: imgUrl, frames: '0-'+(Number(process.env.GIF_FRAME_LIM)-1), cumulative: (firstFrameData[0].frameInfo.disposal == 1) }).then(async function (frameData) {
                    async function cb () {
                        const codec = new GifCodec();
                        codec.encodeGif(frames.filter(f => f != undefined)).then(gif => {
                            parentPort.postMessage(gif.buffer)
                            clearInterval(workerInterval)
                        }).catch(e => {
                            //console.log(e)
                            parentPort.postMessage(null)
                            clearInterval(workerInterval)
                        });
                    }
                    framesProcessed = 0;
                    for(let i = 0; i < frameData.length; i++) {
                        if(i%frameSkip == 0) {
                            queueWorker(list, i, speed, frameData, frameSkip, cb);
                        }
                    }
                });
            });
        } catch(e) {
            //console.log(e)
            parentPort.postMessage(null)
        }
    }
});

let workers = []

async function queueWorker(list, i, speed, frameData, frameSkip, cb) {
    workers.push({ list, i, speed, frameData, frameSkip, cb });
}


async function workerQueuer(){
    if(concurrent < cpuCount && workers.length > 0) {
        let startConcurrent = concurrent
        for(let i = 0; i < cpuCount-startConcurrent; i++) {
            if(workers.length == 0) return
            let { list, i, speed, frameData, frameSkip, cb } = workers.shift();
            concurrent++;
            setImmediate(() => {
                spawnWorker(list, i, speed, frameData, frameSkip, cb)
            });
        }
    }
}
let workerInterval = setInterval(workerQueuer, 500);

function spawnWorker(list, i, speed, frameData, frameSkip, cb) {
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
            concurrent--;
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
                concurrent--;
            });
        }
    });
}