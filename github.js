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
    , full_repo = data.repository.owner.name + '/' + repo
    , name_str = ''
    , channels = []

  Object.keys(github_config.patterns).forEach(function(pattern) {
    var regex = new RegExp(pattern)
    if (regex.test(full_repo)) {
      channels += github_config.patterns[pattern]
    }
  })

  channels = channels || github_config.default_channel

  data.commits.forEach(function(commit) {
    if (commit.author.username) {
      name_str = (' - ' + commit.author.username +
                  ' (' + commit.author.name + ')')
    } else if (commit.author.name) {
      name_str = ' - ' + commit.author.name
    } else {
      name_str = ''
    }
    message = (full_repo + ': ' + commit.id.substr(0,7) + ' *' +
               colors.green(branch) + '* ' +
               commit.message + name_str)
    zen.send_privmsg(channels, message)
    console.log(channels + ' -> ' + message)
  })
})
