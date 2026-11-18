// Config plugin for tilo-health: the HealthKit entitlement and the read-only usage string.
// Read only and no background delivery (phase 2 decides). App Store Connect still requires an
// NSHealthUpdateUsageDescription for any app with the HealthKit entitlement (ITMS-90683, build 17);
// Tilo never asks to write, so iOS never shows it, and it says so.
const { withInfoPlist, withEntitlementsPlist } = require('expo/config-plugins')

const DEFAULT_UPDATE = "Tilo doesn't save anything to Apple Health."

const DEFAULT_SHARE =
  'Tilo reads your sleep times and your steps and walks, so it can show them next to your check-in. Nothing is shared unless you choose to.'

module.exports = function withTiloHealth(config, props = {}) {
  config = withInfoPlist(config, (c) => {
    c.modResults.NSHealthShareUsageDescription = props.shareUsage || DEFAULT_SHARE
    c.modResults.NSHealthUpdateUsageDescription = props.updateUsage || DEFAULT_UPDATE
    return c
  })
  config = withEntitlementsPlist(config, (c) => {
    c.modResults['com.apple.developer.healthkit'] = true
    c.modResults['com.apple.developer.healthkit.access'] = []
    return c
  })
  return config
}
