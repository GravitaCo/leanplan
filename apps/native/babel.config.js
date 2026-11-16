// `import.meta.env.VITE_*` in shared code (Vite's flags) becomes this build's values, so a feature
// is on or off in both apps from the same names (native-build-plan finding 6). Values come from
// EXPO_PUBLIC_* at build time (eas.json), with the web's defaults when unset.
const ENV_KEYS = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'VITE_ONBOARDING', 'VITE_WELLBEING', 'VITE_MIND_REVIEWED', 'VITE_SUPP_NAMES']

function importMetaEnv({ types: t }) {
  const envObject = () =>
    t.objectExpression(
      ENV_KEYS.map((k) =>
        t.objectProperty(
          t.identifier(k),
          // EXPO_PUBLIC_* are inlined by babel-preset-expo; undefined when unset, as on web
          t.memberExpression(t.memberExpression(t.identifier('process'), t.identifier('env')), t.identifier('EXPO_PUBLIC_' + k.slice(5))),
        ),
      ),
    )
  return {
    name: 'tilo-import-meta-env',
    visitor: {
      MemberExpression(p) {
        const n = p.node
        if (t.isMetaProperty(n.object) && n.object.meta.name === 'import' && n.object.property.name === 'meta' && t.isIdentifier(n.property, { name: 'env' })) {
          p.replaceWith(envObject())
        }
      },
    },
  }
}

module.exports = function (api) {
  api.cache(true)
  return {
    presets: ['babel-preset-expo'],
    plugins: [importMetaEnv],
  }
}
