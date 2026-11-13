Pod::Spec.new do |s|
  s.name           = 'TiloCamera'
  s.version        = '1.0.0'
  s.summary        = 'Tilo camera: barcode scanning and label photos on AVFoundation and Vision'
  s.description    = 'A camera preview with live retail barcode reads, per-frame label photo quality, photo capture, and barcodes from a still photo. Apple frameworks only.'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = { :ios => '17.0' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.frameworks = 'AVFoundation', 'Vision', 'ImageIO', 'PhotosUI', 'UniformTypeIdentifiers'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
