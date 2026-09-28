package expo.modules.alarmring

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import java.util.Calendar

const val ACTION_ALARM_FIRE = "expo.modules.alarmring.ACTION_ALARM_FIRE"
const val EXTRA_ALARM_ID = "alarmId"

// AlarmManager 는 "이번 주 월·수·금마다" 같은 반복을 직접 지원하지 않는다
// (setRepeating 은 최신 안드로이드에서 부정확해서 알람 용도로 못 쓴다) — 그래서
// 표준적인 방식대로, 다음으로 맞는 시각 딱 한 번만 예약해 두고, 그 알람이
// 울릴 때(AlarmReceiver) 스스로 다음 차례를 다시 예약한다.
object AlarmScheduler {

  fun scheduleNext(context: Context, alarm: Alarm) {
    cancel(context, alarm.id)
    if (!alarm.enabled) return

    val triggerAt = nextTriggerMillis(alarm)
    val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    val pending = pendingIntentFor(context, alarm.id)

    try {
      am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pending)
    } catch (e: SecurityException) {
      // 정확한 알람 권한이 없으면(드묾) 그냥 근사 시각으로라도 울리게 한다.
      am.set(AlarmManager.RTC_WAKEUP, triggerAt, pending)
    }
  }

  fun cancel(context: Context, alarmId: String) {
    val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    am.cancel(pendingIntentFor(context, alarmId))
  }

  fun rescheduleAll(context: Context) {
    AlarmStore(context).getAll().forEach { scheduleNext(context, it) }
  }

  private fun pendingIntentFor(context: Context, alarmId: String): PendingIntent {
    val intent = Intent(context, AlarmReceiver::class.java).apply {
      action = ACTION_ALARM_FIRE
      putExtra(EXTRA_ALARM_ID, alarmId)
    }
    // requestCode 는 알람마다 달라야 서로 다른 PendingIntent 로 취급된다.
    return PendingIntent.getBroadcast(
      context,
      alarmId.hashCode(),
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
  }

  // days 가 비어 있으면(하루짜리 알람) 다음으로 오는 hour:minute 한 번만.
  // days 가 있으면 그중 오늘 이후로 가장 가까운 요일.
  private fun nextTriggerMillis(alarm: Alarm): Long {
    val now = Calendar.getInstance()

    fun candidateFor(dayOffset: Int): Calendar {
      val c = now.clone() as Calendar
      c.add(Calendar.DAY_OF_YEAR, dayOffset)
      c.set(Calendar.HOUR_OF_DAY, alarm.hour)
      c.set(Calendar.MINUTE, alarm.minute)
      c.set(Calendar.SECOND, 0)
      c.set(Calendar.MILLISECOND, 0)
      return c
    }

    if (alarm.days.isEmpty()) {
      val today = candidateFor(0)
      return if (today.after(now)) today.timeInMillis else candidateFor(1).timeInMillis
    }

    // Calendar.DAY_OF_WEEK: 일=1 ... 토=7. 저장 형식(0=일...6=토)과 -1 차이.
    for (offset in 0..7) {
      val candidate = candidateFor(offset)
      val dow = candidate.get(Calendar.DAY_OF_WEEK) - 1
      if (alarm.days.contains(dow) && candidate.after(now)) {
        return candidate.timeInMillis
      }
    }
    // 이론상 여기 오지 않는다(7일 안에 반드시 하나는 걸린다) — 안전장치.
    return candidateFor(7).timeInMillis
  }
}
