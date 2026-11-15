Pod::Spec.new do |s|
  s.name           = 'TiloStore'
  s.version        = '1.0.0'
  s.summary        = 'Tilo on-device storage (files with Data Protection, and the Keychain)'
  s.description    = 'Synchronous key-value stores for the shared code: app data in files under iOS Data Protection, the sign-in session in the Keychain.'
  s.author         = 'Gravita Creative Ltd'
  s.homepage       = 'https://app.tilo.fit'
  s.platforms      = { :ios => '17.0' }
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks     = 'Security'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
  s.source_files = "**/*.{h,m,mm,swift}"
end
