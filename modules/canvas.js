const { createCanvas, loadImage, registerFont } = require("canvas");
const { fillTextWithTwemoji, measureText } = require("./emojiCanvasText");

// Fonts
registerFont(__dirname + "/../fonts/RobotoBlack.ttf", { family: "Roboto" });
registerFont(__dirname + "/../fonts/Matoran.ttf", { family: "Matoran" });

function canvasText(
  text,
  fontSize,
  fontFamily,
  width,
  align = "center",
  lineSpacing = 1.5,
  fillStyle = "black",
  bg = "transparent"
) {
  return new Promise(async (resolve, reject) => {
    // Init canvas
    let maxHeight = 16384;
    const canvas = createCanvas(width, maxHeight);
    const ctx = canvas.getContext("2d");

    if (bg != "transparent") {
      // Handle background colour
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Text styling
    ctx.fillStyle = fillStyle;
    ctx.textAlign = align;
    ctx.font = fontSize + "px " + fontFamily;

    let startX = 0;
    if (align == "center") startX = width / 2;

    let lineHeight = lineSpacing * fontSize; // Calculate line height

    let lines = await printAtWordWrap(
      ctx,
      text,
      startX,
      fontSize,
      lineHeight,
      width
    ); // Print text on canvas, returns number of lines

    resolve([
      await canvas.toBuffer(),
      lineHeight * lines > maxHeight ? maxHeight : lineHeight * lines,
    ]); // Resolve canvas image buffer and used height
  });
}

function printAtWordWrap(context, text, x, y, lineHeight, fitWidth) {
  return new Promise(async (resolve, reject) => {
    fitWidth = fitWidth || 0;

    let forcedLines = text.split("\n"); // Create new lines where they exist in the input text

    if (fitWidth <= 0 && forcedLines.length <= 1) {
      await fillTextWithTwemoji(context, text, x, y, {
        emojiTopMarginPercent: 0.1,
      }); // Fills text using Twemoji support
      resolve(0);
    }

    var currentLine = 0; // Init number of lines
    for (let l = 0; l < forcedLines.length; l++) {
      var words = forcedLines[l].split(" ");
      var idx = 1;
      while (words.length > 0 && idx <= words.length) {
        var str = words.slice(0, idx).join(" ");
        var w = measureText(context, str).width; // Measure text, replacing discord custom emojis with the clown emoji
        if (w > fitWidth || words[0] == "\n") {
          if (idx == 1) {
            idx = 2;
          }
          await fillTextWithTwemoji(
            context,
            words.slice(0, idx - 1).join(" "),
            lineHeight,
            x,
            y + lineHeight * currentLine,
            { emojiTopMarginPercent: 0.15 }
          ); // Fills text using Twemoji support
          currentLine++;
          words = words.splice(idx - 1);
          idx = 1;
        } else {
          idx++;
        }
      }
      if (idx > 0)
        await fillTextWithTwemoji(
          context,
          words.join(" "),
          lineHeight,
          x,
          y + lineHeight * currentLine,
          { emojiTopMarginPercent: 0.15 }
        ); // Fills text using Twemoji support
      currentLine++;
    }

    resolve(currentLine); // Resolve number of lines
  });
}
function canvasRect(
  width,
  height,
  strokeStyle = "white",
  strokeWidth = 4,
  fillStyle = "black"
) {
  return new Promise(async (resolve, reject) => {
    try {
      // Init canvas
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext("2d");

      // Draw outline
      ctx.beginPath();
      ctx.rect(0, 0, width, height);
      ctx.fillStyle = strokeStyle;
      ctx.fill();

      // Clear area within outline
      ctx.clearRect(
        strokeWidth,
        strokeWidth,
        width - strokeWidth * 2,
        height - strokeWidth * 2
      );

      // Draw filled rect
      ctx.beginPath();
      ctx.rect(
        strokeWidth,
        strokeWidth,
        width - strokeWidth * 2,
        height - strokeWidth * 2
      );
      ctx.fillStyle = fillStyle;
      ctx.fill();

      resolve(await canvas.toBuffer()); // Resolve canvas image buffer
    } catch (e) {
      reject(e);
    }
  });
}
function canvasWindow(
  width,
  height,
  x,
  y,
  holeWidth,
  holeHeight,
  strokeStyle = "white",
  strokeWidth = 4,
  strokeOffset = 0,
  fillStyle = "black"
) {
  return new Promise(async (resolve, reject) => {
    try {
      // Init canvas
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext("2d");

      // Background
      ctx.fillStyle = fillStyle;
      ctx.fillRect(0, 0, width, height);

      // Outline
      ctx.rect(0, 0, width, height);
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = strokeWidth;
      ctx.strokeRect(
        x - strokeOffset,
        y - strokeOffset,
        holeWidth + strokeOffset * 2,
        holeHeight + strokeOffset * 2
      );

      // Cut hole ("window")
      ctx.clearRect(x, y, holeWidth, holeHeight);

      resolve(await canvas.toBuffer()); // Resolve canvas image buffer
    } catch (e) {
      reject(e);
    }
  });
}

module.exports = {
  canvasText,
  canvasRect,
  canvasWindow,
};
