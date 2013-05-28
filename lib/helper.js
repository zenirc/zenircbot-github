var path = require('path')
  , fs = require('fs')
  , GitHubAPI = require('github')
  , cli = require('commander')

cli.option('-o --org <name>', 'Organization')
  .option('-u --user <name>', 'Username of the owner of the repos')
  .option('-r --repo <name>', 'Repo name')
  .option('-t --target <url>', 'Target URL')
  .parse(process.argv)

var gh = new GitHubAPI({version: '3.0.0'})
  , configFile = path.join(__dirname, 'api.json')

var token = null
if (fs.existsSync(configFile)) {
  var conf = JSON.parse(fs.readFileSync(configFile))
  token = conf.token
}

function login(next) {
  var name, pass
  if (token) {
    gh.authenticate({
      type: 'oauth'
    , token: token
    })
    return next()
  }
  cli.prompt('Username: ', getUsername)
  function getUsername(_name) {
    name = _name
    if (name) {
      cli.password('Password: ', getPassword)
    } else {
      console.log('username required')
      process.exit(1)
    }
  }
  function getPassword(_pass) {
    pass = _pass
    if (pass) {
      gh.authenticate({
        type: 'basic'
      , username: name
      , password: pass
      })
      gh.authorization.create({
        scopes: ['repo']
      , note: 'For the zenircbot-github helper script'
      , note_url: 'https://github.com/zenirc/zenircbot-github'
      }, function(err, res){
        if (err) {
          console.log(err)
          process.exit(1)
        }
        token = res.token
        fs.writeFile(configFile, JSON.stringify(res, null, 4))
        next()
      })
    } else {
      console.log('password required')
      process.exit(1)
    }
  }
}


function getRepos(options) {
  login(function() {
    var user = options.user || options.org
    if (options.repo) {
      createHook(user, options.repo, options.url)
    }
    if (options.org) {
      gh.repos.getFromOrg({org: user}, createHookFromList)
    } else if (options.user) {
      gh.repos.getFromUser({user: user}, createHookFromList)
    }

    function createHookFromList(err, res) {
      if (err) {
        console.log(err)
        process.exit(1)
      }
      res.forEach(function(repo){
        createHook(user, repo.name, options.target)
      })
    }
  })
}

function createHook(user, repo, url) {
  gh.repos.getHooks({user: user, repo: repo}, function(err, res) {
    if (err){
      console.log(err)
      process.exit(1)
    }
    var match = false
    res.forEach(function(hook) {
      if (hook.name === 'web') {
        if (hook.config.url === url) {
          match = true
        }
      }
    })
    if (!match) {
      console.log('hook for ' + user + '/' + repo + ' does not exist, creating')
      gh.repos.createHook({
        user: user
      , repo: repo
      , name: 'web'
      , config: {url: url}
      , active: true
      })
    } else {
      console.log('hook for ' + user + '/' + repo + ' exists')
    }
    console.log({'remaining calls': res.meta['x-ratelimit-remaining']})
    // check to see if the hook exists then create
  })
}

module.exports.login = login

if (module.id === '.') {
  exit = false
  if (!cli.org && !cli.user) {
    console.log('org or user required')
  }
  if (!cli.target) {
    console.log('target url required')
  }
  if (exit) {
    process.exit(1)
  }
  getRepos(cli)
}
