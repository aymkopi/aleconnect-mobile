Pod::Spec.new do |s|
  s.name = 'ConsumerOfflineMaps'
  s.version = '1.0.0'
  s.summary = 'Bounded public Albay offline map downloads'
  s.description = s.summary
  s.license = { :type => 'MIT' }
  s.author = 'ALEConnect'
  s.homepage = 'https://aleconnect.app'
  s.platforms = { :ios => '16.0' }
  s.source = { :git => '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = '**/*.{h,m,swift}'
  s.swift_version = '5.9'
end
