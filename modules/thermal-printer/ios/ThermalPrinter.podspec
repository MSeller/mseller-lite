Pod::Spec.new do |s|
  s.name           = 'ThermalPrinter'
  s.version        = '1.0.0'
  s.summary        = 'Raw ESC/POS byte transport to thermal printers over BLE and TCP.'
  s.description    = 'Local Expo module for mseller-lite: CoreBluetooth and Network.framework transports.'
  s.author         = 'MSeller'
  s.homepage       = 'https://mseller.app'
  s.license        = { :type => 'UNLICENSED' }
  s.platforms      = { :ios => '15.1' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.frameworks = 'CoreBluetooth', 'Network'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "**/*.{h,m,swift}"
end
