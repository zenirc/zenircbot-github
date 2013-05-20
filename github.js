var api = require('zenircbot-api')
var bot_config = api.load_config('../../bot.json')
var zen = new api.ZenIRCBot(bot_config.redis.host,
                            bot_config.redis.port,
                            bot_config.redis.db)
var sub = zen.get_redis_client()
var color = require('./lib/colors')
var github_config = api.load_config('./github.json')


zen.register_commands("github.js", [])

sub.subscribe('web_in')
sub.on('message', function(channel, message){
    message = JSON.parse(message)
    if (message.app != 'github') {
        return null
    }

    var data = message.body
    var branch = data.ref.substr(11)
    var repo = data.repository.name
    var name_str = ''
    var irc_channel = github_config[repo] || github_config.default_channel
    for (var i=0; i< data.commits.length; i++) {
        var commit = data.commits[i]
        if (commit.author.username) {
            name_str = (' - ' + commit.author.username +
                        ' (' + commit.author.name + ')')
        } else if (commit.author.name) {
            name_str = ' - ' + commit.author.name
        } else {
            name_str = ''
        }
        message = (repo + ': ' + commit.id.substr(0,7) + ' *' +
                   color.green + branch + color.reset + '* ' +
                   commit.message + name_str)
        zen.send_privmsg(irc_channel, message)
        console.log(channel + ' -> ' + message)
    }
})
