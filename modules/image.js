var Jimp = require('jimp');
const webp = require('webp-converter');
const http = require('https'); // or 'https' for https:// URLs
const fs = require('fs');

function readURL(imgUrl) {
    return new Promise(async (resolve, reject) => {
        if(imgUrl.match(/(\.webp)/g)) {
            const file = fs.createWriteStream(__dirname+"/tmp.webp");
            const request = http.get(imgUrl, async function(response) {
                await response.pipe(file);
                let result = await webp.dwebp(__dirname+"/tmp.webp", __dirname+"/tmp.png", "-o");
                let img = await readURL(__dirname+'/tmp.png');
                fs.unlink(__dirname+"/tmp.webp", () => {});
                fs.unlink(__dirname+"/tmp.png", () => {});
                resolve(img);
            });
        } else {
            Jimp.read(imgUrl).then(async img => {
                resolve(img)
            });
        }
    });
}
function readBuffer(buffer) {
    return new Promise(async (resolve, reject) => {
        Jimp.read(buffer).then(async img => {
            resolve(img)
        });
    });
}

function exec(imgUrl, list) {
    return new Promise(async (resolve, reject) => {
        Jimp.read(imgUrl).then(async img => {
            for(let i = 0; i < list.length; i++) {
                img = await performMethod(img, list[i][0], list[i][1]);
            }
            resolve(img.getBufferAsync(Jimp.AUTO))
        }).catch(reject)
    })
}

function execNewImage(w, h, bg, list) {
    return new Promise(async (resolve, reject) => {
        new Jimp(w, h, bg, async (err, img) => {
            if(err) {
                reject()
            } else {
                for(let i = 0; i < list.length; i++) {
                    img = await performMethod(img, list[i][0], list[i][1]);
                }
                resolve(img.getBufferAsync(Jimp.AUTO))
            }
        })
    })
}

function performMethod(img, method, params) {
    return new Promise(async (resolve, reject) => {
        try {
            let newImg = img;
            if(img[method]) {
                newImg = await img[method](...params)
            } else {
                newImg = await customMethod(img, method, params)
            }
            resolve(newImg);
        } catch(e) {
            reject(e)
        }
    })
}
function customMethod(img, method, params) {
    return new Promise(async (resolve, reject) => {
        try {
            let newImg = img;
            if(method == "canvasScale") {
                // canvasScale params - [0: Scale factor]
                newImg = await img.crop(Math.round((1-params[0])*img.bitmap.width/2), Math.round((1-params[0])*img.bitmap.height/2), Math.round(params[0]*img.bitmap.width), Math.round(params[0]*img.bitmap.height))
            }
            resolve(newImg);
        } catch(e) {
            reject(e)
        }
    })
}

function measureText(font, str) {
    return new Promise(async (resolve, reject) => {
        resolve(await Jimp.measureText(Jimp[font], str));
    });
}
function measureTextHeight(font, str, width) {
    return new Promise(async (resolve, reject) => {
        resolve(await Jimp.measureTextHeight(Jimp[font], str, width));
    });
}
function loadFont(path) {
    return new Promise(async (resolve, reject) => {
        Jimp.loadFont(path).then(font => {
            resolve(font)
        });
    });
}

const { createCanvas, loadImage, registerFont } = require('canvas')
const { fillTextWithTwemoji } = require('node-canvas-with-twemoji');

registerFont(__dirname+'/../fonts/RobotoBlack.otf', { family: 'Roboto' })

function canvasText(text, fontSize, fontFamily, width) {
    return new Promise(async (resolve, reject) => {
        let maxHeight = 16384
        const canvas = createCanvas(width, maxHeight)
        const ctx = canvas.getContext('2d')
        
        ctx.textAlign = "center";
        ctx.font = fontSize+"px "+fontFamily

        let lineHeight = 1.10909*fontSize

        let lines = await printAtWordWrap(ctx, text, width/2, fontSize, lineHeight, width);

        resolve([await canvas.toBuffer(), (lineHeight*lines > maxHeight ? maxHeight : lineHeight*lines)])
    })
}

function printAtWordWrap( context , text, x, y, lineHeight, fitWidth) {
    return new Promise(async (resolve, reject) => {
        fitWidth = fitWidth || 0;
        
        if (fitWidth <= 0)
        {
            await fillTextWithTwemoji(context, text, x, y, { emojiTopMarginPercent: 0.1} );
            resolve(1);
        }
        var words = text.split(' ');
        var currentLine = 0;
        var idx = 1;
        while (words.length > 0 && idx <= words.length)
        {
            var str = words.slice(0,idx).join(' ');
            var w = context.measureText(str).width;
            if ( w > fitWidth )
            {
                if (idx==1)
                {
                    idx=2;
                }
                await fillTextWithTwemoji(context, words.slice(0,idx-1).join(' '), x, y + (lineHeight*currentLine), { emojiTopMarginPercent: 0.1} );
                currentLine++;
                words = words.splice(idx-1);
                idx = 1;
            }
            else
            {idx++;}
        }
        if  (idx > 0)
        await fillTextWithTwemoji(context, words.join(' '), x, y + (lineHeight*currentLine), { emojiTopMarginPercent: 0.1} );

        resolve(currentLine+1);
    });
}


module.exports = {
    exec,
    execNewImage,
    readURL,
    readBuffer,
    measureText,
    measureTextHeight,
    loadFont,
    canvasText
}