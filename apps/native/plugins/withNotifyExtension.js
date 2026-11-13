/**
 * Tilo's Notification Service Extension (native-build-plan N12; mental-performance, 13 Nov 2026), as
 * a config plugin, so the generated ios/ project (CNG) gets it on every prebuild:
 *
 * - an app extension target, TiloNotifyExtension (bundle id <app>.NotifyExtension), built from
 *   targets/notify-extension/NotificationService.swift, embedded in the app;
 * - the app group group.<app> on the app and on the extension, where the extension records each Mind
 *   reminder it sees arrive and the app reads them (modules/tilo-notify);
 * - the extension declared for EAS (extra.eas.build.experimental.ios.appExtensions), so EAS creates
 *   its signing credentials before the build.
 *
 * The extension's version and build number are the app's, as the App Store requires.
 * Re-running prebuild over a project that already has the target leaves it as it is.
 */
const fs = require('fs')
const path = require('path')
const { withDangerousMod, withEntitlementsPlist, withXcodeProject } = require('@expo/config-plugins')

const NAME = 'TiloNotifyExtension'
const SOURCE = path.join(__dirname, '..', 'targets', 'notify-extension', 'NotificationService.swift')
const DEPLOYMENT_TARGET = '17.0'

const groupOf = (bundleId) => `group.${bundleId}`
const extIdOf = (bundleId) => `${bundleId}.NotifyExtension`
const quote = (v) => `"${v}"`

function infoPlist(version, build) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key>
  <string>$(DEVELOPMENT_LANGUAGE)</string>
  <key>CFBundleDisplayName</key>
  <string>${NAME}</string>
  <key>CFBundleExecutable</key>
  <string>$(EXECUTABLE_NAME)</string>
  <key>CFBundleIdentifier</key>
  <string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
  <key>CFBundleInfoDictionaryVersion</key>
  <string>6.0</string>
  <key>CFBundleName</key>
  <string>$(PRODUCT_NAME)</string>
  <key>CFBundlePackageType</key>
  <string>$(PRODUCT_BUNDLE_PACKAGE_TYPE)</string>
  <key>CFBundleShortVersionString</key>
  <string>${version}</string>
  <key>CFBundleVersion</key>
  <string>${build}</string>
  <key>NSExtension</key>
  <dict>
    <key>NSExtensionPointIdentifier</key>
    <string>com.apple.usernotifications.service</string>
    <key>NSExtensionPrincipalClass</key>
    <string>$(PRODUCT_MODULE_NAME).NotificationService</string>
  </dict>
</dict>
</plist>
`
}

function entitlements(group) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.application-groups</key>
  <array>
    <string>${group}</string>
  </array>
</dict>
</plist>
`
}

/** The app group on the app itself. */
const withAppGroup = (config) =>
  withEntitlementsPlist(config, (c) => {
    const group = groupOf(c.ios.bundleIdentifier)
    const key = 'com.apple.security.application-groups'
    const list = Array.isArray(c.modResults[key]) ? c.modResults[key] : []
    if (!list.includes(group)) c.modResults[key] = [...list, group]
    return c
  })

/** The extension's files in ios/TiloNotifyExtension/. */
const withExtensionFiles = (config) =>
  withDangerousMod(config, ['ios', (c) => {
    const dir = path.join(c.modRequest.platformProjectRoot, NAME)
    fs.mkdirSync(dir, { recursive: true })
    fs.copyFileSync(SOURCE, path.join(dir, 'NotificationService.swift'))
    fs.writeFileSync(path.join(dir, 'Info.plist'), infoPlist(c.version ?? '1.0.0', c.ios?.buildNumber ?? '1'))
    fs.writeFileSync(path.join(dir, `${NAME}.entitlements`), entitlements(groupOf(c.ios.bundleIdentifier)))
    return c
  }])

/** The target in an Xcode project (the `xcode` library's project); does nothing if it's there. */
function addExtensionTarget(proj, { bundleId, version, buildNumber, teamId }) {
  // already there (the project file stores the name quoted once read back)
  if (proj.pbxTargetByName(NAME) || proj.pbxTargetByName(quote(NAME))) return false
  const target = proj.addTarget(NAME, 'app_extension', NAME, extIdOf(bundleId))

  // only the source goes in the group: Info.plist and the entitlements are build settings, not
  // resources (in a Resources phase Xcode would copy them into the bundle)
  const group = proj.addPbxGroup(['NotificationService.swift'], NAME, NAME)
  const groups = proj.hash.project.objects.PBXGroup
  const main = Object.keys(groups).find((k) => groups[k] && groups[k].name === undefined && groups[k].path === undefined)
  if (main) proj.addToPbxGroup(group.uuid, main)

  proj.addBuildPhase(['NotificationService.swift'], 'PBXSourcesBuildPhase', 'Sources', target.uuid)
  proj.addBuildPhase([], 'PBXResourcesBuildPhase', 'Resources', target.uuid)
  proj.addBuildPhase([], 'PBXFrameworksBuildPhase', 'Frameworks', target.uuid)
  // the app builds the extension first (addTarget embeds it, but adds no dependency)
  // (the xcode library adds nothing when the project has no dependency sections yet, as a fresh
  // Expo project doesn't)
  const objects = proj.hash.project.objects
  objects.PBXTargetDependency ??= {}
  objects.PBXContainerItemProxy ??= {}
  const app = proj.getFirstTarget()
  if (app) proj.addTargetDependency(app.uuid, [target.uuid])

  const configs = proj.pbxXCBuildConfigurationSection()
  for (const key of Object.keys(configs)) {
    const cfg = configs[key]
    if (!cfg || !cfg.buildSettings || cfg.buildSettings.PRODUCT_NAME !== quote(NAME)) continue
    Object.assign(cfg.buildSettings, {
      CODE_SIGN_ENTITLEMENTS: quote(`${NAME}/${NAME}.entitlements`),
      CODE_SIGN_STYLE: 'Automatic',
      CURRENT_PROJECT_VERSION: quote(buildNumber),
      DEVELOPMENT_TEAM: teamId,
      GENERATE_INFOPLIST_FILE: 'NO',
      INFOPLIST_FILE: quote(`${NAME}/Info.plist`),
      IPHONEOS_DEPLOYMENT_TARGET: DEPLOYMENT_TARGET,
      MARKETING_VERSION: quote(version),
      PRODUCT_BUNDLE_IDENTIFIER: quote(extIdOf(bundleId)),
      SKIP_INSTALL: 'YES',
      SWIFT_VERSION: '5.0',
      TARGETED_DEVICE_FAMILY: quote('1'),
    })
  }
  return true
}

/** The target in the Xcode project. */
const withExtensionTarget = (config) =>
  withXcodeProject(config, (c) => {
    addExtensionTarget(c.modResults, {
      bundleId: c.ios.bundleIdentifier,
      version: c.version ?? '1.0.0',
      buildNumber: c.ios?.buildNumber ?? '1',
      teamId: c.ios?.appleTeamId ?? '',
    })
    return c
  })

/** The extension, declared for EAS's credentials. */
const withEasDeclaration = (config) => {
  const bundleId = config.ios.bundleIdentifier
  const extra = (config.extra ??= {})
  const eas = (extra.eas ??= {})
  const build = (eas.build ??= {})
  const experimental = (build.experimental ??= {})
  const ios = (experimental.ios ??= {})
  const list = Array.isArray(ios.appExtensions) ? ios.appExtensions : []
  if (!list.some((e) => e.targetName === NAME)) {
    ios.appExtensions = [...list, {
      targetName: NAME,
      bundleIdentifier: extIdOf(bundleId),
      entitlements: { 'com.apple.security.application-groups': [groupOf(bundleId)] },
    }]
  }
  return config
}

module.exports = function withNotifyExtension(config) {
  if (!config.ios?.bundleIdentifier) throw new Error('withNotifyExtension: ios.bundleIdentifier is required')
  return withEasDeclaration(withExtensionTarget(withExtensionFiles(withAppGroup(config))))
}
module.exports.NAME = NAME
// for scripts/test-extension.mjs
module.exports._test = { addExtensionTarget, infoPlist, entitlements, withEasDeclaration, groupOf, extIdOf }
