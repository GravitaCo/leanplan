Pod::Spec.new do |s|
  s.name           = 'TiloNotify'
  s.version        = '1.0.0'
  s.summary        = 'Tilo reminder deliveries recorded by the Notification Service Extension'
  s.description    = 'Reads and empties the deliveries the extension records in the app group.'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = { :ios => '17.0' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
