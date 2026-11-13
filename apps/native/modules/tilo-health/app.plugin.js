// Config plugin for tilo-health: the HealthKit entitlement and the read-only usage string.
// Read only, so no NSHealthUpdateUsageDescription and no background delivery (phase 2 adds it).
const { withInfoPlist, withEntitlementsPlist } = require('expo/config-plugins')

const DEFAULT_SHARE =
  'Tilo reads your sleep times and your steps and walks, so it can show them next to your check-in. Nothing is shared unless you choose to.'

module.exports = function withTiloHealth(config, props = {}) {
  config = withInfoPlist(config, (c) => {
    c.modResults.NSHealthShareUsageDescription = props.shareUsage || DEFAULT_SHARE
    delete c.modResults.NSHealthUpdateUsageDescription
    return c
  })
  config = withEntitlementsPlist(config, (c) => {
    c.modResults['com.apple.developer.healthkit'] = true
    c.modResults['com.apple.developer.healthkit.access'] = []
    return c
  })
  return config
}
