Pod::Spec.new do |s|
  s.name           = 'TiloAi'
  s.version        = '1.0.0'
  s.summary        = 'Tilo on-device AI (Apple Foundation Models)'
  s.description    = 'Calls the on-device Foundation Models language model where the iPhone supports it.'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = { :ios => '17.0' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
