Pod::Spec.new do |s|
  s.name           = 'TiloHealth'
  s.version        = '1.0.0'
  s.summary        = 'Tilo Apple Health reads (HealthKit)'
  s.description    = 'Read-only HealthKit access for sleep, steps and walking workouts.'
  s.author         = 'Gravita Creative Ltd'
  s.homepage       = 'https://app.tilo.fit'
  s.platforms      = { :ios => '17.0' }
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks     = 'HealthKit'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
  s.source_files = "**/*.{h,m,mm,swift}"
end
