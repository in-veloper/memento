package expo.modules.todaywidget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.view.View
import android.widget.RemoteViews

private const val ACTION_GRADE = "expo.modules.todaywidget.ACTION_GRADE"
private const val EXTRA_CARD_ID = "cardId"
private const val EXTRA_GRADE = "grade"

// 다시/애매/완벽 버튼마다 안정적인 requestCode 가 필요하다 — PendingIntent 는
// requestCode + 컴포넌트/액션으로만 같은 것인지 판단하고(extras 는 안 본다),
// FLAG_UPDATE_CURRENT 를 주면 매번 새 cardId 로 extras 만 갈아끼워 준다.
private fun requestCode(appWidgetId: Int, gradeKey: String): Int {
  val slot = when (gradeKey) {
    "again" -> 1
    "hard" -> 2
    else -> 3
  }
  return appWidgetId * 10 + slot
}

class TodayWidgetProvider : AppWidgetProvider() {

  override fun onUpdate(context: Context, mgr: AppWidgetManager, appWidgetIds: IntArray) {
    appWidgetIds.forEach { render(context, mgr, it) }
  }

  // 위젯을 크게 늘리면(resizeMode="vertical" 이라 세로로 늘어난다) 앞면을
  // 보여주는 칸도 같이 커진다 — maxLines 를 넉넉히 잡아 뒀으니 커진 만큼
  // 다시 그려 주면 실제로 더 보인다.
  override fun onAppWidgetOptionsChanged(
    context: Context,
    mgr: AppWidgetManager,
    appWidgetId: Int,
    newOptions: android.os.Bundle
  ) {
    render(context, mgr, appWidgetId)
  }

  // 위젯 버튼(다시/애매/완벽) 탭이 여기로 들어온다. 채점을 반영한 뒤,
  // 지금 화면에 붙어 있는 이 위젯의 모든 인스턴스(홈 + 잠금화면)를 다시 그린다.
  override fun onReceive(context: Context, intent: Intent) {
    super.onReceive(context, intent)
    if (intent.action != ACTION_GRADE) return

    val cardId = intent.getStringExtra(EXTRA_CARD_ID) ?: return
    val gradeKey = intent.getStringExtra(EXTRA_GRADE) ?: return

    MementoStore(context).grade(cardId, gradeKey)
    refreshAll(context)
  }

  companion object {
    // TodayWidgetModule(JS 에서 부르는 새로고침)과, 채점 직후 자기 자신 둘 다
    // 여기로 온다.
    fun refreshAll(context: Context) {
      val mgr = AppWidgetManager.getInstance(context)
      val ids = mgr.getAppWidgetIds(ComponentName(context, TodayWidgetProvider::class.java))
      ids.forEach { render(context, mgr, it) }
    }

    private fun render(context: Context, mgr: AppWidgetManager, appWidgetId: Int) {
      val views = RemoteViews(context.packageName, R.layout.today_widget)
      val openApp = context.packageManager.getLaunchIntentForPackage(context.packageName)
      val openAppPending = openApp?.let {
        PendingIntent.getActivity(
          context, 0, it,
          PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
      }

      val today = MementoStore(context).peekToday()

      if (today == null) {
        // DB 파일 자체가 없다 — 메멘토 앱을 아직 한 번도 안 연 상태.
        showEmpty(views, "메멘토를 먼저 열어 카드를 만들어 주세요.")
      } else {
        val (card, count) = today
        if (card == null) {
          showEmpty(views, "오늘 볼 카드를 다 봤습니다 🎉")
        } else {
          views.setViewVisibility(R.id.widget_content, View.VISIBLE)
          views.setViewVisibility(R.id.widget_empty, View.GONE)
          views.setViewVisibility(R.id.widget_badge, View.VISIBLE)
          views.setTextViewText(R.id.widget_badge, "${count}장")

          // ListView(widget_front) 는 TodayFrontRemoteViewsService 가 채운다.
          // 데이터 URI 를 카드 내용에 따라 다르게 줘야 시스템이 "새 데이터"로
          // 보고 다시 붙는다 — 같은 URI 면 이전에 캐시해 둔 걸 그대로 쓴다.
          val frontIntent = Intent(context, TodayFrontRemoteViewsService::class.java).apply {
            putExtra(TodayFrontRemoteViewsService.EXTRA_FRONT_TEXT, card.front)
            data = Uri.parse("todaywidget://front/$appWidgetId/${card.id}")
          }
          views.setRemoteAdapter(R.id.widget_front, frontIntent)

          views.setOnClickPendingIntent(R.id.btn_again, gradePendingIntent(context, appWidgetId, card.id, "again"))
          views.setOnClickPendingIntent(R.id.btn_hard, gradePendingIntent(context, appWidgetId, card.id, "hard"))
          views.setOnClickPendingIntent(R.id.btn_good, gradePendingIntent(context, appWidgetId, card.id, "good"))
        }
      }

      openAppPending?.let { views.setOnClickPendingIntent(R.id.widget_meta, it) }
      mgr.updateAppWidget(appWidgetId, views)
      mgr.notifyAppWidgetViewDataChanged(appWidgetId, R.id.widget_front)
    }

    private fun showEmpty(views: RemoteViews, message: String) {
      views.setViewVisibility(R.id.widget_content, View.GONE)
      views.setViewVisibility(R.id.widget_badge, View.GONE)
      views.setViewVisibility(R.id.widget_empty, View.VISIBLE)
      views.setTextViewText(R.id.widget_empty, message)
    }

    private fun gradePendingIntent(
      context: Context,
      appWidgetId: Int,
      cardId: String,
      gradeKey: String
    ): PendingIntent {
      val intent = Intent(context, TodayWidgetProvider::class.java).apply {
        action = ACTION_GRADE
        putExtra(EXTRA_CARD_ID, cardId)
        putExtra(EXTRA_GRADE, gradeKey)
      }
      return PendingIntent.getBroadcast(
        context,
        requestCode(appWidgetId, gradeKey),
        intent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      )
    }
  }
}
