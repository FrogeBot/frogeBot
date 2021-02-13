require("dotenv").config()
const fs = require("fs")
const YAML = require('yaml')

function cmdFunc(msg, args) {
    const commands = YAML.parse(fs.readFileSync('./commands.yml', 'utf8'))

    let maxPerPage = 10;

    let categories = {}
    let categoriesPaged = {}
    Object.keys(commands).forEach(cmd => {
        if(commands[cmd].hidden || commands[cmd].category == undefined || commands[cmd].description == undefined) return
        if(categories[commands[cmd].category] == undefined) categories[commands[cmd].category] = []
        categories[commands[cmd].category].push(cmd)
    });
    Object.keys(categories).forEach(cat => {
        let category = [[]];
        categories[cat].forEach(cmd => {
            let page = category.length-1;
            if(category[page].length >= maxPerPage) {
                page++;
                category.push([])
            }
            category[page].push(cmd)
        })
        categories[cat] = category
    })
    
    let pages = []
    Object.keys(categories).forEach(cat => {
        categories[cat].forEach(p => {
            pages.push({ title: cat, cmds: p })
        })
    })

    let page = (args.length > 0 && Number.isInteger(Number(args)) && Number(args) >= 1 && Number(args) <= pages.length) ? Number(args) : 1;

    msg.channel.send({
        "embed": {
            "title": `Help - ${pages[page-1].title}`,
            "description": pages[page-1].cmds.map(key => { return "**"+key+"**" + ' ' + commands[key].description }).join('\n'),
            "color": Number(process.env.EMBED_COLOUR),
            "footer": {
              "text": `Page ${page} of ${pages.length}`
            },
            "author": {
                "name": process.env.BOT_NAME,
                "icon_url": msg.client.user.displayAvatarURL()
            }
        }
    })
}

module.exports = {
    cmdFunc
}