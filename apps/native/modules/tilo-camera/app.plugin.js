// Config plugin for modules/tilo-camera: the camera permission's purpose string on iOS, worded with
// compliance (13 Nov 2026). The lead adds "./modules/tilo-camera/app.plugin.js" to app.json's plugins.
const { withInfoPlist } = require('expo/config-plugins')

const CAMERA = "Tilo uses the camera to scan a pack's barcode, and to photograph its nutrition label when you choose to, so the numbers can be read. Tilo doesn't keep your photos."

module.exports = function withTiloCamera(config, { cameraPermission = CAMERA } = {}) {
  return withInfoPlist(config, (c) => {
    c.modResults.NSCameraUsageDescription = cameraPermission
    return c
  })
}
module.exports.CAMERA = CAMERA
