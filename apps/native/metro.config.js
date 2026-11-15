// Metro for the native app. The app lives in apps/native but runs the web app's shared code
// (repo src/: core, data, store) unchanged, so Metro watches it and resolves:
//   - `@/…` to the repo's src/ (the alias the shared code uses, as Vite and esbuild do on web);
//   - every package imported from shared code to THIS app's node_modules, never the web's
//     (the web root has React 18; native has its own React, zustand and supabase-js).
// Not an npm workspace on purpose: the web keeps its own lockfile and versions untouched.
const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const projectRoot = __dirname
const repoRoot = path.resolve(projectRoot, '../..')
const shared = [path.join(repoRoot, 'src'), path.join(repoRoot, 'supabase', 'functions', '_shared')]

const config = getDefaultConfig(projectRoot)
config.watchFolders = [...(config.watchFolders || []), ...shared]

const inShared = (p) => !!p && shared.some((d) => p.startsWith(d + path.sep))
const isBare = (m) => !m.startsWith('.') && !m.startsWith('/') && !m.startsWith('@/')
const anchor = path.join(projectRoot, 'package.json')

const upstream = config.resolver.resolveRequest
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolve = upstream || context.resolveRequest
  if (moduleName.startsWith('@/')) {
    return resolve(context, path.join(repoRoot, 'src', moduleName.slice(2)), platform)
  }
  if (isBare(moduleName) && inShared(context.originModulePath)) {
    return resolve({ ...context, originModulePath: anchor }, moduleName, platform)
  }
  return resolve(context, moduleName, platform)
}

module.exports = config
