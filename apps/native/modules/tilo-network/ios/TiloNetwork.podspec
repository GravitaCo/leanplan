Pod::Spec.new do |s|
  s.name           = 'TiloNetwork'
  s.version        = '1.0.0'
  s.summary        = 'Tilo connection state (Apple Network framework)'
  s.description    = 'Online or offline from NWPathMonitor, as a browser means navigator.onLine. No test requests.'
  s.author         = 'Gravita Creative Ltd'
  s.homepage       = 'https://app.tilo.fit'
  s.platforms      = { :ios => '17.0' }
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks     = 'Network'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
  s.source_files = "**/*.{h,m,mm,swift}"
end
