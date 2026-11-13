Pod::Spec.new do |s|
  s.name           = 'TiloAuth'
  s.version        = '1.0.0'
  s.summary        = 'Tilo: Sign in with Apple on AuthenticationServices'
  s.description    = 'Sign in with Apple (ASAuthorizationController) and the system Sign in with Apple button. Apple frameworks only.'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = { :ios => '17.0' }
  s.source         = { git: '' }
  s.static_framework = true
  s.swift_version  = '5.9'

  s.dependency 'ExpoModulesCore'
  s.frameworks = 'AuthenticationServices'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
