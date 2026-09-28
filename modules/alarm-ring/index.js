import { requireNativeModule } from 'expo-modules-core';

let module_ = null;
try {
  module_ = requireNativeModule('AlarmRing');
} catch {
  module_ = null;
}

export default module_;
