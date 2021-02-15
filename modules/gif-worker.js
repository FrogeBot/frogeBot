const { GifFrame, GifUtil, GifCodec } = require('gifwrap');
const { isMainThread, parentPort, Worker } = require('worker_threads');
let { readBuffer, readURL } = require('./image.js');
require('dotenv').config();
var gm = require('gm');
if (process.env.USE_IMAGEMAGICK == 'true') {
    gm = gm.subClass({ imageMagick: true });
}
var Jimp = require('jimp');

const os = require('os');
const cpuCount = os.cpus().length;
let concurrent = 0;
let framesProcessed = 0;
let frames = [];

parentPort.once('message', async (msg) => {
    if (!isMainThread) {
        let { imgUrl, list, frameSkip, speed, jimp } = msg;
        try {
            const codec = new GifCodec();
            let gif = await codec.decodeGif(await readURL(imgUrl));
            async function cb() {
                codec
                    .encodeGif(frames.filter((f) => f != undefined))
                    .then((gif) => {
                        parentPort.postMessage(gif.buffer);
                        clearInterval(workerInterval);
                    })
                    .catch((e) => {
                        console.log(e);
                        parentPort.postMessage(null);
                        clearInterval(workerInterval);
                    });
            }
            framesProcessed = 0;
            for (let i = 0; i < gif.frames.length; i++) {
                if (i % frameSkip == 0) {
                    if (
                        gif.frames[i].disposalMethod == 1 &&
                        frameSkip > 1 &&
                        i >= frameSkip
                    ) {
                        let frameImg = await GifUtil.copyAsJimp(
                            Jimp,
                            gif.frames[i + 1 - frameSkip]
                        );
                        for (let j = 1; j <= frameSkip; j++) {
                            let newFrameImg = await GifUtil.copyAsJimp(
                                Jimp,
                                gif.frames[i + j - frameSkip]
                            );
                            frameImg.composite(newFrameImg, 0, 0);
                        }
                        gif.frames[i].bitmap = frameImg.bitmap;
                    }
                    queueWorker(
                        list,
                        i,
                        speed,
                        gif.frames,
                        frameSkip,
                        jimp,
                        cb
                    );
                }
            }
        } catch (e) {
            console.log(e);
            parentPort.postMessage(null);
        }
    }
});

let workers = [];

async function queueWorker(list, i, speed, frameData, frameSkip, jimp, cb) {
    workers.push({ list, i, speed, frameData, frameSkip, jimp, cb });
}

async function workerQueuer() {
    if (concurrent < cpuCount && workers.length > 0) {
        let startConcurrent = concurrent;
        for (let i = 0; i < cpuCount - startConcurrent; i++) {
            if (workers.length == 0) return;
            let {
                list,
                i,
                speed,
                frameData,
                frameSkip,
                jimp,
                cb,
            } = workers.shift();
            concurrent++;
            setImmediate(() => {
                spawnWorker(list, i, speed, frameData, frameSkip, jimp, cb);
            });
        }
    }
}
let workerInterval = setInterval(workerQueuer, 500);

async function spawnWorker(list, i, speed, frameData, frameSkip, jimp, cb) {
    let { width, height } = frameData[0].bitmap;
    let frame = await frameData[i];
    if (list == null) {
        let newImg = new Jimp(width, height, 'transparent').composite(
            await GifUtil.copyAsJimp(Jimp, frame),
            frame.xOffset,
            frame.yOffset
        );
        maxSize = Number(process.env.MAX_GIF_SIZE);
        if (newImg.bitmap.width > maxSize || newImg.bitmap.height > maxSize) {
            await newImg.scaleToFit(maxSize, maxSize);
        }
        let newFrame = new GifFrame(newImg.bitmap, {
            disposalMethod: frame.disposalMethod,
            delayCentisecs: Math.max(
                2,
                Math.round(frame.delayCentisecs / speed)
            ),
            interlaced: frame.interlaced,
        });
        GifUtil.quantizeDekker(newFrame);
        frames[i] = newFrame;
        framesProcessed += frameSkip;
        if (framesProcessed >= frameData.length) cb();
        concurrent--;
    } else {
        let newImg = await new Jimp(width, height).composite(
            await GifUtil.copyAsJimp(Jimp, frame),
            frame.xOffset,
            frame.yOffset
        );
        maxSize = Number(process.env.MAX_GIF_SIZE);
        if (newImg.bitmap.width > maxSize || newImg.bitmap.height > maxSize) {
            await newImg.scaleToFit(maxSize, maxSize);
        }
        let worker = new Worker(
            __dirname + `/image-worker${jimp ? '-jimp' : ''}.js`
        );
        worker.postMessage({
            buffer: await newImg.getBufferAsync(Jimp.AUTO),
            list,
            allowBackgrounds: i == 0 || frameData[i].disposalMethod != 1,
        });

        worker.on('message', async (img) => {
            if (img == null) return;
            let newImg = await readBuffer(Buffer.from(img));
            let newFrame = new GifFrame(newImg.bitmap, {
                disposalMethod: frame.disposalMethod,
                delayCentisecs: Math.max(
                    2,
                    Math.round(frame.delayCentisecs / speed)
                ),
                interlaced: frame.interlaced,
            });

            GifUtil.quantizeDekker(newFrame);
            frames[i] = newFrame;
            framesProcessed += frameSkip;
            if (framesProcessed >= frameData.length) cb();
            concurrent--;
        });
    }
}
