import { requireNativeModule } from 'expo-modules-core';

// 홈/잠금화면 위젯에 새로고침 신호만 보낸다. 위젯 자체의 채점·표시 로직은
// TodayWidgetProvider(네이티브)가 앱과 별개로 갖고 있다 — 이 모듈은 앱 안에서
// 카드를 채점했을 때 위젯도 바로 최신 카드를 보여주게 하는 용도뿐이다.
let module_ = null;
try {
  module_ = requireNativeModule('TodayWidget');
} catch {
  module_ = null;
}

export default module_;
