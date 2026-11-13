// Config plugin for modules/tilo-auth: the Sign in with Apple entitlement on iOS
// (com.apple.developer.applesignin = ["Default"]). The App ID fit.tilo.app needs the capability
// ticked too (EAS syncs capabilities on build; docs/plans/native-sign-in-with-apple.md has the manual
// steps). Added to app.json's plugins as "./modules/tilo-auth/app.plugin.js".
const { withEntitlementsPlist } = require('expo/config-plugins')

module.exports = function withTiloAuth(config) {
  return withEntitlementsPlist(config, (c) => {
    c.modResults['com.apple.developer.applesignin'] = ['Default']
    return c
  })
}
