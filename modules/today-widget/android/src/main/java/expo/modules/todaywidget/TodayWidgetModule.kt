package expo.modules.todaywidget

import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// 앱 안에서 카드를 채점했을 때(store.js 의 persist() 직후) 위젯도 바로 같은
// 내용을 보여주도록 부르는 새로고침 한 함수뿐이다. 위젯 자체의 채점 로직은
// TodayWidgetProvider 가 앱과 무관하게 이미 갖고 있다 — 이 함수는 그냥
// "네가 마지막으로 그린 화면이 이제 낡았으니 다시 그려라" 신호다.
class TodayWidgetModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("TodayWidget")

    Function("refresh") {
      val context = appContext.reactContext ?: throw CodedException("앱 컨텍스트를 찾을 수 없습니다.")
      TodayWidgetProvider.refreshAll(context)
    }
  }
}
