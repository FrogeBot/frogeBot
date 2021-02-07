var Jimp = require('jimp');
const webp = require('webp-converter');
const http = require('https');
const fs = require('fs');

function readURL(imgUrl) {
    return new Promise(async (resolve, reject) => {
        // Check if .webp, requires additional handling
        if(imgUrl.match(/(\.webp)/gi)) {
            // Get .webp image
            const file = fs.createWriteStream(__dirname+"/tmp.webp");
            const request = http.get(imgUrl, async function(response) {
                await response.pipe(file); // Save to tmp.webp
                let result = await webp.dwebp(__dirname+"/tmp.webp", __dirname+"/tmp.png", "-o"); // Convert to tmp.webp -> tmp.png
                let img = await Jimp.read(__dirname+'/tmp.png'); // Read tmp.png for jimp
                fs.unlink(__dirname+"/tmp.webp", () => {}); // Remove tmp.webp
                fs.unlink(__dirname+"/tmp.png", () => {}); // Remove tmp.png
                resolve(img); // Resolve image converted to image/png
            });
        } else {
            // Read image type supported by jimp
            Jimp.read(imgUrl).then(async img => {
                resolve(img) // Resolve image
            });
        }
    });
}
function readBuffer(buffer) {
    return new Promise(async (resolve, reject) => {
        // Read image type supported by jimp (from buffer)
        Jimp.read(buffer).then(async img => {
            resolve(img) // Resolve image
        });
    });
}

function exec(imgUrl, list) {
    return new Promise(async (resolve, reject) => {
        // Get image from URL
        readURL(imgUrl).then(async img => {
            for(let i = 0; i < list.length; i++) { // Loop through actions in list
                img = await performMethod(img, list[i][0], list[i][1]); // Perform each in succecssion
            }
            resolve(img.getBufferAsync(Jimp.AUTO)) // Resolve image
        }).catch(reject)
    })
}

function execNewImage(w, h, bg, list) {
    return new Promise(async (resolve, reject) => {
        // Create image from specified parameters
        new Jimp(w, h, bg, async (err, img) => {
            if(err) {
                reject()
            } else {
                for(let i = 0; i < list.length; i++) { // Loop through actions in list
                    img = await performMethod(img, list[i][0], list[i][1]); // Perform each in succecssion
                }
                resolve(img.getBufferAsync(Jimp.AUTO)) // Resolve image
            }
        })
    })
}

function performMethod(img, method, params) {
    return new Promise(async (resolve, reject) => {
        try {
            let newImg = img;
            if(img[method]) { // If native jimp method
                newImg = await img[method](...params) // Run method function on image
            } else { // If custom method or undefined method
                newImg = await customMethod(img, method, params) // Attempt to run method function on image
            }
            resolve(newImg); // Resolve image
        } catch(e) {
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
            }
            resolve(newImg); // Resolve image
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

const { createCanvas, loadImage, registerFont } = require('canvas')
const { fillTextWithTwemoji } = require('node-canvas-with-twemoji-and-discord-emoji');

// Fonts
registerFont(__dirname+'/../fonts/RobotoBlack.otf', { family: 'Roboto' })

function canvasText(text, fontSize, fontFamily, width, align = "center", lineSpacing = 1.5) {
    return new Promise(async (resolve, reject) => {
        // Init canvas
        let maxHeight = 16384
        const canvas = createCanvas(width, maxHeight)
        const ctx = canvas.getContext('2d')
        
        // Text styling
        ctx.textAlign = align;
        ctx.font = fontSize+"px "+fontFamily

        let startX = 0;
        if(align == "center") startX = width/2

        let lineHeight = lineSpacing*fontSize // Calculate line height

        let lines = await printAtWordWrap(ctx, text, startX, fontSize, lineHeight, width); // Print text on canvas, returns number of lines

        resolve([await canvas.toBuffer(), (lineHeight*lines > maxHeight ? maxHeight : lineHeight*lines)]) // Resolve canvas image buffer and used height
    })
}

function printAtWordWrap( context , text, x, y, lineHeight, fitWidth) {
    return new Promise(async (resolve, reject) => {
        fitWidth = fitWidth || 0;
        
        if (fitWidth <= 0)
        {
            await fillTextWithTwemoji(context, text, x, y, { emojiTopMarginPercent: 0.1} ); // Fills text using Twemoji support
            resolve(0);
        }
        var words = text.split(' ');
        var currentLine = 0; // Resolve number of lines
        var idx = 1;
        while (words.length > 0 && idx <= words.length)
        {
            var str = words.slice(0,idx).join(' ');
            var w = context.measureText(str.replace(/(<a?:.+:[0-9]+>)/gi, "🤡")).width; // Measure text, replacing discord custom emojis with the clown emoji
            if ( w > fitWidth )
            {
                if (idx==1)
                {
                    idx=2;
                }
                await fillTextWithTwemoji(context, words.slice(0,idx-1).join(' '), x, y + (lineHeight*currentLine), { emojiTopMarginPercent: 0.1} ); // Fills text using Twemoji support
                currentLine++;
                words = words.splice(idx-1);
                idx = 1;
            }
            else
            {idx++;}
        }
        if  (idx > 0)
        await fillTextWithTwemoji(context, words.join(' '), x, y + (lineHeight*currentLine), { emojiTopMarginPercent: 0.1} ); // Fills text using Twemoji support

        resolve(currentLine+1); // Resolve number of lines
    });
}

// Exports
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