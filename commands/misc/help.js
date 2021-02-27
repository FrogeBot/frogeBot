require("dotenv").config()
const fs = require("fs")
const YAML = require('yaml')

function cmdFunc(msg, args) {
    const commands = YAML.parse(fs.readFileSync('./commands.yml', 'utf8')) // Read commands list

    let maxPerPage = 10; // Amount of commands to show per page

    let categories = {}
    Object.keys(commands).forEach(cmd => { // Iterate through all commands
        if(commands[cmd].hidden || commands[cmd].category == undefined || commands[cmd].description == undefined) return // If command is hidden or required data is missing
        if(process.env.MUSIC_ENABLED != "true" && commands[cmd].type == "music") return // If music commands are disabled, ignore music commands
        if(categories[commands[cmd].category] == undefined) categories[commands[cmd].category] = [] // Define category key if it doesn't exist
        categories[commands[cmd].category].push(cmd) // Push command to category
    });
    Object.keys(categories).forEach(cat => { // Iterate through categories
        let category = [[]];
        categories[cat].forEach(cmd => { // Iterate through commands in category
            let page = category.length-1; // Get page
            if(category[page].length >= maxPerPage) { // If maxPerPage reached go to the next page
                page++;
                category.push([])
            }
            category[page].push(cmd) // Push command to the page
        })
        categories[cat] = category // Replace category in categories with paged version
    })
    
    let pages = []
    Object.keys(categories).forEach(cat => { // Iterate through categories
        categories[cat].forEach(p => { // Iterate through pages
            pages.push({ title: cat, cmds: p }) // Add page to pages
        })
    })

    let page = (args.length > 0 && Number.isInteger(Number(args)) && Number(args) >= 1 && Number(args) <= pages.length) ? Number(args) : 1; // Determine which page to show

    // Send the help page
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