This doc includes external services that need to be configured for the app to work, such as
external identity providers.

# OAuth2 Providers #

## GitHub ##
- https://github.com/settings/applications/new
  - Application name: `Identitree Local Dev`
  - Homepage URL: `http://panel.lvh.me:42003`
  - Authorization callback URL: `http://api.lvh.me:42001/external-identities/oauth2/github/callback`