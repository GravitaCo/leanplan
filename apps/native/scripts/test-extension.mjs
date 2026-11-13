/**
 * The Notification Service Extension (N12) without a Mac: the config plugin run against Expo's own
 * iOS project template, the files it writes, the EAS declaration, and the Swift sources' constants
 * against the shared reminder rules. The extension itself runs only on an iPhone (device test).
 *   (apps/native) npm run test:extension
 */
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { MIND_KINDS } from '../../../supabase/functions/_shared/reminders.ts'
import { fromExtension, keyOf } from '../lib/platform/notifyReconcile.ts'

const require = createRequire(import.meta.url)
const xcode = require('xcode')
const plugin = require('../plugins/withNotifyExtension.js')
const { addExtensionTarget, infoPlist, entitlements, withEasDeclaration, groupOf, extIdOf } = plugin._test

let failed = 0
let passed = 0
const check = (name, ok, detail) => { if (ok) passed++; else { failed++; console.error('FAIL', name, detail === undefined ? '' : JSON.stringify(detail)) } }

const app = JSON.parse(readFileSync(new URL('../app.json', import.meta.url), 'utf8')).expo
const BUNDLE = app.ios.bundleIdentifier

/* ---------- the app config ---------- */
check('app.json runs the plugin', app.plugins.includes('./plugins/withNotifyExtension'))
check('app group and extension id follow the bundle id', groupOf(BUNDLE) === 'group.fit.tilo.app' && extIdOf(BUNDLE) === 'fit.tilo.app.NotifyExtension')
{
  const c = withEasDeclaration({ ios: { bundleIdentifier: BUNDLE }, extra: { eas: { projectId: 'x' } } })
  const list = c.extra.eas.build.experimental.ios.appExtensions
  check('EAS knows the extension before the build (credentials), with its app group, projectId kept',
    c.extra.eas.projectId === 'x' && list.length === 1 && list[0].targetName === plugin.NAME && list[0].bundleIdentifier === 'fit.tilo.app.NotifyExtension'
    && JSON.stringify(list[0].entitlements) === JSON.stringify({ 'com.apple.security.application-groups': ['group.fit.tilo.app'] }))
  check('declared once however often the plugin runs', withEasDeclaration(c).extra.eas.build.experimental.ios.appExtensions.length === 1)
}

/* ---------- the files ---------- */
const plist = infoPlist('0.1.0', '7')
check('Info.plist: a notification service extension, principal class NotificationService',
  plist.includes('<string>com.apple.usernotifications.service</string>') && plist.includes('<string>$(PRODUCT_MODULE_NAME).NotificationService</string>'))
check('Info.plist: the app\'s version and build number (the App Store requires them to match)',
  plist.includes('<key>CFBundleShortVersionString</key>\n  <string>0.1.0</string>') && plist.includes('<key>CFBundleVersion</key>\n  <string>7</string>'))
check('entitlements: the app group only', /<key>com\.apple\.security\.application-groups<\/key>\s*<array>\s*<string>group\.fit\.tilo\.app<\/string>\s*<\/array>/.test(entitlements('group.fit.tilo.app'))
  && (entitlements('group.fit.tilo.app').match(/<key>/g) || []).length === 1)

/* ---------- the Xcode project, from Expo's own template ---------- */
const dir = mkdtempSync(join(tmpdir(), 'tilo-ext-'))
try {
  execFileSync('tar', ['-xzf', require.resolve('expo/template.tgz'), '-C', dir, 'package/ios/HelloWorld.xcodeproj/project.pbxproj'])
  const proj = xcode.project(join(dir, 'package/ios/HelloWorld.xcodeproj/project.pbxproj'))
  proj.parseSync()
  const added = addExtensionTarget(proj, { bundleId: BUNDLE, version: '0.1.0', buildNumber: '7', teamId: 'M8R77TCYF8' })
  // written and read back, as prebuild does
  const text = proj.writeSync()
  const re = xcode.project(join(dir, 'x.pbxproj'))
  re.hash = require('xcode/lib/parser/pbxproj').parse(text)
  const objs = re.hash.project.objects
  const targets = Object.entries(objs.PBXNativeTarget).filter(([k]) => !k.endsWith('_comment')).map(([k, t]) => ({ k, ...t }))
  const ext = targets.find((t) => String(t.name).replace(/"/g, '') === plugin.NAME)
  const main = targets.find((t) => t !== ext)
  check('the extension target is added, as an app extension', added === true && !!ext && String(ext.productType).replace(/"/g, '') === 'com.apple.product-type.app-extension')
  const settings = Object.values(objs.XCBuildConfiguration).filter((c) => c && c.buildSettings && String(c.buildSettings.PRODUCT_NAME).replace(/"/g, '') === plugin.NAME).map((c) => c.buildSettings)
  const un = (v) => String(v).replace(/"/g, '')
  check('Debug and Release: bundle id, Info.plist, entitlements, team, iOS 17, iPhone, the app\'s version',
    settings.length === 2 && settings.every((b) => un(b.PRODUCT_BUNDLE_IDENTIFIER) === 'fit.tilo.app.NotifyExtension' && un(b.INFOPLIST_FILE) === 'TiloNotifyExtension/Info.plist'
      && un(b.CODE_SIGN_ENTITLEMENTS) === 'TiloNotifyExtension/TiloNotifyExtension.entitlements' && un(b.DEVELOPMENT_TEAM) === 'M8R77TCYF8'
      && un(b.IPHONEOS_DEPLOYMENT_TARGET) === '17.0' && un(b.TARGETED_DEVICE_FAMILY) === '1' && un(b.MARKETING_VERSION) === '0.1.0' && un(b.CURRENT_PROJECT_VERSION) === '7'), settings)
  const phase = (id) => objs.PBXSourcesBuildPhase?.[id] ?? objs.PBXResourcesBuildPhase?.[id] ?? objs.PBXFrameworksBuildPhase?.[id] ?? objs.PBXCopyFilesBuildPhase?.[id]
  const extPhases = ext.buildPhases.map((p) => ({ id: p.value, comment: p.comment, files: (phase(p.value)?.files || []).map((f) => f.comment) }))
  check('the extension compiles NotificationService.swift and copies no resources',
    extPhases.some((p) => p.comment === 'Sources' && p.files.length === 1 && /NotificationService\.swift"? in Sources/.test(p.files[0]))
    && extPhases.filter((p) => p.comment === 'Resources').every((p) => p.files.length === 0), extPhases)
  const embed = main.buildPhases.map((p) => objs.PBXCopyFilesBuildPhase?.[p.value]).filter(Boolean)
  check('the app embeds it in PlugIns', embed.some((p) => String(p.dstSubfolderSpec) === '13' && (p.files || []).some((f) => /TiloNotifyExtension\.appex/.test(f.comment))))
  const deps = (main.dependencies || []).map((d) => objs.PBXTargetDependency?.[d.value])
  check('the app depends on it, so Xcode builds it first', deps.some((d) => d && d.target === ext.k))
  check('no stray resource entries for Info.plist or the entitlements', !/(Info\.plist|\.entitlements) in Resources/.test(text.split('/* Begin PBXBuildFile section */')[1]?.split('/* End PBXBuildFile section */')[0] ?? 'x'))
  check('running it again changes nothing', addExtensionTarget(re, { bundleId: BUNDLE, version: '0.1.0', buildNumber: '7', teamId: 'M8R77TCYF8' }) === false)
} finally {
  rmSync(dir, { recursive: true, force: true })
}

/* ---------- the Swift sources against the shared rules ---------- */
const nse = readFileSync(new URL('../targets/notify-extension/NotificationService.swift', import.meta.url), 'utf8')
const mod = readFileSync(new URL('../modules/tilo-notify/ios/TiloNotifyModule.swift', import.meta.url), 'utf8')
const swiftKinds = (nse.match(/mindKinds: Set<String> = \[([^\]]*)\]/)?.[1] ?? '').match(/"([^"]+)"/g)?.map((x) => x.slice(1, -1)).sort()
check('the extension records exactly the Mind types (reminders.ts MIND_KINDS)', JSON.stringify(swiftKinds) === JSON.stringify([...MIND_KINDS].sort()), swiftKinds)
for (const [name, re] of [['app group', /appGroup = "([^"]+)"/], ['key', /key = "([^"]+)"/]]) {
  const a = nse.match(re)?.[1], b = mod.match(re)?.[1]
  check(`extension and module share the ${name}`, !!a && a === b, [a, b])
}
check('the module\'s app group is the plugin\'s', mod.match(/appGroup = "([^"]+)"/)?.[1] === groupOf(BUNDLE))
check('the extension hands the content back unchanged', /contentHandler\(request\.content\)/.test(nse) && !/bestAttemptContent|mutableCopy/.test(nse))
check('the extension keeps at most 60 and records no text', /maxKept = 60/.test(nse) && !/alert|title|\.body\b/.test(nse.replace(/\/\/\/[^\n]*/g, '')))
check('the extension source is outside the module (the module\'s pod must not compile it)', !mod.includes('UNNotificationServiceExtension'))

/* ---------- the app's side ---------- */
const ID = '0b7f3c2e-4d1a-4f6e-9a2b-3c4d5e6f7a8b'
check('deliveries: keyed by the send\'s id, as the app keys the same notification',
  JSON.stringify(fromExtension([{ id: ID, kind: 'checkin', at: 5 }])) === JSON.stringify([{ key: keyOf({ id: ID }, 'whatever', 9), kind: 'checkin', at: 5 }]))
check('deliveries: malformed, other types and missing ids dropped, oldest first',
  JSON.stringify(fromExtension([{ id: ID, kind: 'plan', at: 9 }, { id: ID, kind: 'supp', at: 1 }, { kind: 'checkin', at: 1 }, { id: 'nope!', kind: 'checkin', at: 1 }, { id: ID, kind: 'checkin', at: 'x' }, 3, null, { id: ID.replace('0b', '1b'), kind: 'wind-down', at: 2 }]).map((p) => p.kind)) === JSON.stringify(['wind-down', 'plan']))
check('deliveries: nothing is nothing', fromExtension(null).length === 0 && fromExtension({}).length === 0)

console.log(`notification extension: ${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
