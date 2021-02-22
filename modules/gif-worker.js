const { GifFrame, GifUtil, GifCodec } = require("gifwrap");
const { isMainThread, parentPort, Worker } = require("worker_threads");
let { readBuffer, readURL } = require("@frogebot/image")({
  imageMagick: process.env.USE_IMAGEMAGICK,
  maxGifSize: process.env.MAX_GIF_SIZE,
  maxImageSize: process.env.MAX_IMAGE_SIZE,
});
require("dotenv").config();
var gm = require("gm");
if (process.env.USE_IMAGEMAGICK == "true") {
  gm = gm.subClass({ imageMagick: true });
}
var Jimp = require("jimp");

const os = require("os");
const cpuCount = os.cpus().length;
let concurrent = 0;
let framesProcessed = 0;
let frames = [];

parentPort.once("message", async (msg) => {
  if (!isMainThread) {
    let { imgUrl, list, frameSkip, speed, jimp } = msg;
    try {
      const codec = new GifCodec();
      let gif = await codec.decodeGif(await readURL(imgUrl)); // Decode GIF
      async function cb() { // Callback function
        codec
          .encodeGif(frames.filter((f) => f != undefined)) // Encode GIF
          .then((gif) => {
            parentPort.postMessage(gif.buffer); // Send GIF back to parent
            clearInterval(workerInterval);
          })
          .catch((e) => {
            console.log(e);
            parentPort.postMessage(null);
            clearInterval(workerInterval);
          });
      }
      framesProcessed = 0;
      for (let i = 0; i < gif.frames.length; i++) { // Iterate frames
        if (i % frameSkip == 0) { // If frameSkip is defined, skip frames
          if (
            gif.frames[i].disposalMethod != 2 &&
            frameSkip > 1 &&
            i >= frameSkip
          ) {
            let frameImg = await GifUtil.copyAsJimp(
              Jimp,
              gif.frames[i + 1 - frameSkip]
            ); // Create Jimp image from frame
            for (let j = 1; j <= frameSkip; j++) { // Stack frames when they are skipped
              let newFrameImg = await GifUtil.copyAsJimp(
                Jimp,
                gif.frames[i + j - frameSkip]
              );
              frameImg.composite(newFrameImg, 0, 0);
            }
            gif.frames[i].bitmap = frameImg.bitmap;
          }
          queueWorker(list, i, speed, gif.frames, frameSkip, jimp, cb); // Queue the worker to be spawned
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
  workers.push({ list, i, speed, frameData, frameSkip, jimp, cb }); // Add worker to the list
}

async function workerQueuer() { // Every 0.5s, check if new workers can be spawned
  if (concurrent < cpuCount && workers.length > 0) {
    let startConcurrent = concurrent;
    for (let i = 0; i < cpuCount - startConcurrent; i++) {
      if (workers.length == 0) return;
      let { list, i, speed, frameData, frameSkip, jimp, cb } = workers.shift();
      concurrent++;
      setImmediate(() => {
        spawnWorker(list, i, speed, frameData, frameSkip, jimp, cb); // Spawn worker
      });
    }
  }
}
let workerInterval = setInterval(workerQueuer, 500);

async function spawnWorker(list, i, speed, frameData, frameSkip, jimp, cb) { // Spawn worker
  let { width, height } = frameData[0].bitmap;
  let frame = await frameData[i];
  if (list == null) { // If no list
    let newImg = new Jimp(width, height, "transparent").composite(
      await GifUtil.copyAsJimp(Jimp, frame),
      frame.xOffset,
      frame.yOffset
    ); // Create Jimp image from frame
    maxSize = Number(process.env.MAX_GIF_SIZE);
    if (newImg.bitmap.width > maxSize || newImg.bitmap.height > maxSize) {
      await newImg.scaleToFit(maxSize, maxSize); // Scale to max size if exceeded
    }
    let newFrame = new GifFrame(newImg.bitmap, {
      disposalMethod: frame.disposalMethod,
      delayCentisecs: Math.max(2, Math.round(frame.delayCentisecs / speed)),
      interlaced: frame.interlaced,
    }); // Create frame from bitmap
    GifUtil.quantizeDekker(newFrame); // Quantize colours in frame
    frames[i] = newFrame;
    framesProcessed += frameSkip;
    if (framesProcessed >= frameData.length) cb(); // If all frames procesed, run callback
    concurrent--;
  } else {
    let newImg = await new Jimp(width, height).composite(
      await GifUtil.copyAsJimp(Jimp, frame),
      frame.xOffset,
      frame.yOffset
    ); // Create Jimp image from frame
    maxSize = Number(process.env.MAX_GIF_SIZE);
    if (newImg.bitmap.width > maxSize || newImg.bitmap.height > maxSize) {
      await newImg.scaleToFit(maxSize, maxSize); // Scale to max size if exceeded
    }
    let worker = new Worker(
      __dirname + `/image-worker${jimp ? "-jimp" : ""}.js`
    );
    worker.postMessage({
      buffer: await newImg.getBufferAsync(Jimp.AUTO),
      list,
      allowBackgrounds: i == 0 || frameData[i].disposalMethod == 2,
    }); // Run image manipulation using worker

    worker.on("message", async (img) => { // Result recieved from worker
      if (img == null) return;
      let newImg = await readBuffer(Buffer.from(img));
      let newFrame = new GifFrame(newImg.bitmap, {
        disposalMethod: frame.disposalMethod,
        delayCentisecs: Math.max(2, Math.round(frame.delayCentisecs / speed)),
        interlaced: frame.interlaced,
      }); // Create frame from bitmap

      GifUtil.quantizeDekker(newFrame); // Quantize colours in frame
      frames[i] = newFrame;
      framesProcessed += frameSkip;
      if (framesProcessed >= frameData.length) cb(); // If all frames procesed, run callback
      concurrent--;
    });
  }
}
