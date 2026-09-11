package expo.modules.todaywidget

import android.content.Intent
import android.widget.RemoteViews
import android.widget.RemoteViewsService

// today_widget.xml 의 widget_front(ListView) 를 채운다. 항목은 딱 하나 —
// 카드 앞면 전체 텍스트. ListView 는 그 한 항목이 자기 칸보다 크면 알아서
// 스크롤해 준다(RemoteViews 는 ScrollView 자체를 지원하지 않는다).
class TodayFrontRemoteViewsService : RemoteViewsService() {
  override fun onGetViewFactory(intent: Intent): RemoteViewsFactory {
    return TodayFrontFactory(applicationContext, intent.getStringExtra(EXTRA_FRONT_TEXT) ?: "")
  }

  companion object {
    const val EXTRA_FRONT_TEXT = "front_text"
  }
}

private class TodayFrontFactory(
  private val context: android.content.Context,
  private val text: String
) : RemoteViewsService.RemoteViewsFactory {
  private val packageName get() = context.packageName

  override fun onCreate() {}
  override fun onDestroy() {}
  override fun onDataSetChanged() {}

  override fun getCount() = 1
  override fun getViewTypeCount() = 1
  override fun getItemId(position: Int) = position.toLong()
  override fun hasStableIds() = true
  override fun getLoadingView(): RemoteViews? = null

  override fun getViewAt(position: Int): RemoteViews {
    val views = RemoteViews(packageName, R.layout.today_widget_front_item)
    views.setTextViewText(R.id.front_text, text)

    // TodayScreen.js 의 typeScale() 과 같은 생각 — 길수록 작게, 그래도 최소
    // 가독성은 유지한다. 이제 ListView 가 스크롤해 주니 예전만큼 공격적으로
    // 줄일 필요는 없다.
    val size = when {
      text.length <= 40 -> 18f
      text.length <= 100 -> 16f
      text.length <= 220 -> 15f
      else -> 14f
    }
    views.setTextViewTextSize(R.id.front_text, android.util.TypedValue.COMPLEX_UNIT_SP, size)
    return views
  }
}
