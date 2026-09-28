package expo.modules.alarmring

import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONArray
import java.util.UUID

// JS(설정 화면) 와 네이티브 알람 시스템 사이를 잇는다. 알람 목록 CRUD +
// "지금 울리는 문제 보여주기/정답 맞히기" 가 전부 여기로 온다.
class AlarmModule : Module() {
  private fun context() = appContext.reactContext ?: throw CodedException("앱 컨텍스트를 찾을 수 없습니다.")

  override fun definition() = ModuleDefinition {
    Name("AlarmRing")

    Function("getAlarms") {
      val arr = JSONArray()
      AlarmStore(context()).getAll().forEach { arr.put(it.toJson()) }
      arr.toString()
    }

    // hour, minute, days(0=일...6=토), enabled, alertMode(sound/vibrate/both), 그리고 수정이면 id 를 받는다.
    Function("saveAlarm") { hour: Int, minute: Int, days: List<Int>, enabled: Boolean, alertMode: String, id: String? ->
      val ctx = context()
      val alarmId = id ?: UUID.randomUUID().toString()
      val alarm = Alarm(alarmId, hour, minute, days, enabled, alertMode)
      AlarmStore(ctx).upsert(alarm)
      AlarmScheduler.scheduleNext(ctx, alarm)
      alarmId
    }

    Function("deleteAlarm") { id: String ->
      val ctx = context()
      AlarmScheduler.cancel(ctx, id)
      AlarmStore(ctx).delete(id)
    }

    // 지금 화면에 보여줄 문제(정답은 안 준다) — 없으면 null.
    Function("getActiveChallenge") {
      AlarmStore(context()).getChallenge()?.toJson()?.toString()
    }

    Function("submitAnswer") { text: String ->
      val ctx = context()
      val challenge = AlarmStore(ctx).getChallenge() ?: return@Function true
      val correct = text.trim().equals(challenge.answer.trim(), ignoreCase = true)
      if (correct) {
        AlarmStore(ctx).setChallenge(null)
        AlarmRingService.stop(ctx)
      }
      correct
    }

    // 문제 없이(카드가 하나도 없을 때) 그냥 확인 눌러서 끄는 경우.
    Function("stopRinging") {
      val ctx = context()
      AlarmStore(ctx).setChallenge(null)
      AlarmRingService.stop(ctx)
    }
  }
}
