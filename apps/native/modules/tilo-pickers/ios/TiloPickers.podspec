Pod::Spec.new do |s|
  s.name           = 'TiloPickers'
  s.version        = '1.0.0'
  s.summary        = 'Tilo date and time wheels (UIDatePicker)'
  s.description    = 'The system date and time wheels, as iOS presents a web page time or date input.'
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
