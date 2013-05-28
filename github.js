var path = require('path')
  , colors = require('irc-colors')
  , api = require('zenircbot-api')
  , zen = new api.ZenIRCBot()
  , sub = zen.get_redis_client()
  , github_config = api.load_config(path.join(__dirname, 'github.json'))

zen.register_commands(path.basename(__filename), [])

sub.subscribe('web_in')
sub.on('message', function(channel, message){
  message = JSON.parse(message)
  if (message.app !== 'github') {
    return null
  }

  var data = message.body
    , branch = data.ref.substr(11)
    , repo = data.repository.name
    , name_str = ''
    , irc_channel = github_config[repo] || github_config.default_channel

  data.commits.forEach(function(commit) {
    if (commit.author.username) {
      name_str = (' - ' + commit.author.username +
                  ' (' + commit.author.name + ')')
    } else if (commit.author.name) {
      name_str = ' - ' + commit.author.name
    } else {
      name_str = ''
    }
    message = (repo + ': ' + commit.id.substr(0,7) + ' *' +
               colors.green(branch) + '* ' +
               commit.message + name_str)
    zen.send_privmsg(irc_channel, message)
    console.log(channel + ' -> ' + message)
  })
})
