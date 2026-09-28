package expo.modules.alarmring

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class AlarmReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    when (intent.action) {
      Intent.ACTION_BOOT_COMPLETED -> {
        // 재부팅하면 안드로이드가 예약해 둔 알람을 전부 지워버린다 — 저장해 둔
        // 목록 그대로 다시 건다.
        AlarmScheduler.rescheduleAll(context)
      }

      ACTION_ALARM_FIRE -> {
        val alarmId = intent.getStringExtra(EXTRA_ALARM_ID) ?: return
        val alarm = AlarmStore(context).get(alarmId) ?: return

        // 요일 반복 알람이면, 울리는 순간 바로 다음 차례를 다시 예약해 둔다
        // (하루짜리 알람은 한 번 울리면 끝 — enabled 를 꺼서 목록엔 남겨 둔다).
        if (alarm.days.isNotEmpty()) {
          AlarmScheduler.scheduleNext(context, alarm)
        } else {
          AlarmStore(context).upsert(alarm.copy(enabled = false))
        }

        val serviceIntent = Intent(context, AlarmRingService::class.java).apply {
          putExtra(EXTRA_ALARM_ID, alarmId)
        }
        context.startForegroundService(serviceIntent)
      }
    }
  }
}
