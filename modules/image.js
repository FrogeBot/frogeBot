var Jimp = require('jimp');

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

module.exports = {
    exec
}