const { createCanvas, loadImage, registerFont } = require('canvas')
const { fillTextWithTwemoji, measureText } = require('./emojiCanvasText');

// Fonts
registerFont(__dirname+'/../fonts/RobotoBlack.ttf', { family: 'Roboto' })

function canvasText(text, fontSize, fontFamily, width, align = "center", lineSpacing = 1.5, fillStyle = "black") {
    return new Promise(async (resolve, reject) => {
        // Init canvas
        let maxHeight = 16384
        const canvas = createCanvas(width, maxHeight)
        const ctx = canvas.getContext('2d')
        
        // Text styling
        ctx.fillStyle = fillStyle
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
            var w = measureText(context, str).width; // Measure text, replacing discord custom emojis with the clown emoji
            if ( w > fitWidth )
            {
                if (idx==1)
                {
                    idx=2;
                }
                await fillTextWithTwemoji(context, words.slice(0,idx-1).join(' '), lineHeight, x, y + (lineHeight*currentLine), { emojiTopMarginPercent: 0.15 } ); // Fills text using Twemoji support
                currentLine++;
                words = words.splice(idx-1);
                idx = 1;
            }
            else
            {idx++;}
        }
        if  (idx > 0)
        await fillTextWithTwemoji(context, words.join(' '), lineHeight, x, y + (lineHeight*currentLine), { emojiTopMarginPercent: 0.15 } ); // Fills text using Twemoji support

        resolve(currentLine+1); // Resolve number of lines
    });
}
function canvasRect(width, height, strokeStyle = "white", strokeWidth = 4, fillStyle = "black") {
    return new Promise(async (resolve, reject) => {
        // Init canvas
        const canvas = createCanvas(width, height)
        const ctx = canvas.getContext('2d')

        ctx.beginPath();
        ctx.rect(0, 0, width, height);
        ctx.fillStyle = strokeStyle
        ctx.fill();

        ctx.clearRect(strokeWidth, strokeWidth, width-strokeWidth*2, height-strokeWidth*2);

        ctx.beginPath();
        ctx.rect(strokeWidth, strokeWidth, width-strokeWidth*2, height-strokeWidth*2);
        ctx.fillStyle = fillStyle
        ctx.fill();

        resolve(await canvas.toBuffer()) // Resolve canvas image buffer
    })
}

module.exports = {
    canvasText,
    canvasRect
}