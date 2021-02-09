var Jimp = require('jimp');
const webp = require('webp-converter');
const http = require('https');
const fs = require('fs');

var mime = require('mime-types')

function readURL(imgUrl) {
    return new Promise(async (resolve, reject) => {
        // Check if .webp, requires additional handling
        if((await mime.lookup(imgUrl.split("?")[0])) === "image/webp") {
            // Get .webp image
            const file = fs.createWriteStream(__dirname+"/tmp.webp");
            const request = http.get(imgUrl, async function(response) {
                await response.pipe(file); // Save to tmp.webp
                let result = await webp.dwebp(__dirname+"/tmp.webp", __dirname+"/tmp.png", "-o"); // Convert to tmp.webp -> tmp.png
                let img = await Jimp.read(__dirname+'/tmp.png'); // Read tmp.png for jimp
                fs.unlink(__dirname+"/tmp.webp", () => {}); // Remove tmp.webp
                fs.unlink(__dirname+"/tmp.png", () => {}); // Remove tmp.png

                maxSize = Number(process.env.MAX_IMG_SIZE);
                if(img.bitmap.width > maxSize && img.bitmap.width > img.bitmap.height) {
                    await img.resize(maxSize, Jimp.AUTO);
                    resolve(img); // Resolve image limited to max size and converted to image/png
                } else if(img.bitmap.height > maxSize) {
                    await img.resize(Jimp.AUTO, maxSize);
                    resolve(img); // Resolve image limited to max size and converted to image/png
                } else {
                    resolve(img) // Resolve image converted to image/png
                }
            });
        } else {
            // Read image type supported by jimp
            Jimp.read(imgUrl).then(async img => {
                maxSize = Number(process.env.MAX_IMG_SIZE);
                if(img.bitmap.width > maxSize && img.bitmap.width > img.bitmap.height) {
                    await img.resize(maxSize, Jimp.AUTO);
                    resolve(img); // Resolve image limited to max size
                } else if(img.bitmap.height > maxSize) {
                    await img.resize(Jimp.AUTO, maxSize);
                    resolve(img); // Resolve image limited to max size
                } else {
                    resolve(img) // Resolve image
                }
            }).catch(reject)
        }
    });
}
function readBuffer(buffer) {
    return new Promise(async (resolve, reject) => {
        // Read image type supported by jimp (from buffer)
        Jimp.read(buffer).then(async img => {
            resolve(img) // Resolve image
        }).catch(reject)
    });
}

const { Worker } = require('worker_threads');


function createNewImage(w, h, bg) {
    return new Promise(async (resolve, reject) => {
        setImmediate(async () => {
            // Create image from specified parameters
            new Jimp(w, h, bg, async (err, img) => {
                if(err) {
                    reject()
                } else {
                    resolve(img) // Resolve image
                }
            })
        });
    })
}

function exec(imgUrl, list) {
    return new Promise(async (resolve, reject) => {
        if((await mime.lookup(imgUrl.split("?")[0])) === "image/gif") {
            try {
                let worker = new Worker(__dirname+"/gif-worker.js")
                worker.postMessage({ imgUrl, list, frameSkip: 1, speed: 1 })
    
                worker.on('message', async (img) => {
                    if(img == null) reject()
                    resolve(Buffer.from(img))
                });
            } catch(e) {
                //console.log(e)
                reject(e)
            }
        } else {
            let worker = new Worker(__dirname+"/image-worker.js")
            worker.postMessage({ imgUrl, list })

            worker.on('message', (img) => {
                if(img == null) reject()
                else resolve(Buffer.from(img))
            });
        }
    })
}

function performMethod(img, method, params) {
    return new Promise(async (resolve, reject) => {
        try {
            for (let i = 0; i < params.length; i++) {
                if(typeof params[i] == "object") {
                    params[i] = await readBuffer(Buffer.from(params[i]));
                }  
            }
            if(img[method]) { // If native jimp method
                img = await img[method](...params) // Run method function on image
            } else { // If custom method or undefined method
                img = await customMethod(img, method, params) // Attempt to run method function on image
            }
            resolve(img); // Resolve image
        } catch(e) {
            //console.log(e)
            reject(e)
        }
    })
}
function customMethod(img, method, params) {
    return new Promise(async (resolve, reject) => {
        try {
            let newImg = img;
            if(method == "canvasScale") { // Crops canvas by factor of existing size
                // canvasScale params - [0: Scale factor]
                let x = Math.round((1-params[0])*img.bitmap.width/2)
                let y = Math.round((1-params[0])*img.bitmap.height/2)
                let w = Math.round(params[0]*img.bitmap.width)
                let h = Math.round(params[0]*img.bitmap.height)
                newImg = await img.crop(x, y, w, h)
                resolve(newImg); // Resolve image
            }
            if(method == "addBackground") { // Adds colour background
                let bgImg = await createNewImage(params[0], params[1], params[2]);
                newImg = await bgImg.composite(img, params[3], params[4])
                resolve(newImg); // Resolve image
            }
        } catch(e) {
            reject(e)
        }
    })
}

function measureText(font, str) {
    return new Promise(async (resolve, reject) => {
        resolve(await Jimp.measureText(Jimp[font], str)); // Measure text using jimp text, obsolete due to canvas text rendering.
    });
}
function measureTextHeight(font, str, width) {
    return new Promise(async (resolve, reject) => {
        resolve(await Jimp.measureTextHeight(Jimp[font], str, width)); // Measure text height using jimp text, obsolete due to canvas text rendering.
    });
}
function loadFont(path) {
    return new Promise(async (resolve, reject) => {
        Jimp.loadFont(path).then(font => {
            resolve(font) // Load and resolve font using jimp text, obsolete due to canvas text rendering.
        });
    });
}

// Exports
module.exports = {
    exec,
    readURL,
    readBuffer,
    measureText,
    measureTextHeight,
    loadFont,
    performMethod,
    customMethod
}