package expo.modules.alarmring

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

// 알람 목록 + "지금 울리고 있는 문제(활성 챌린지)" 를 SharedPreferences 에
// JSON으로 저장한다. 메멘토의 카드 데이터(RKStorage)와는 완전히 별개 저장소다
// — 알람은 그 자체로 앱을 안 띄우고도(리시버·서비스만으로) 읽고 써야 해서,
// React Native 쪽 AsyncStorage 를 거치지 않고 네이티브가 직접 소유한다.

private const val PREFS = "alarm_ring"
private const val KEY_ALARMS = "alarms"
private const val KEY_CHALLENGE = "challenge"

data class Alarm(
  val id: String,
  val hour: Int,
  val minute: Int,
  val days: List<Int>, // 0=일 ... 6=토. 비어 있으면 "다음 한 번만" 울리는 알람.
  val enabled: Boolean,
  val alertMode: String = "sound" // "sound" | "vibrate" | "both"
) {
  fun toJson(): JSONObject = JSONObject().apply {
    put("id", id)
    put("hour", hour)
    put("minute", minute)
    put("days", JSONArray(days))
    put("enabled", enabled)
    put("alertMode", alertMode)
  }

  companion object {
    fun fromJson(o: JSONObject): Alarm {
      val daysArr = o.optJSONArray("days") ?: JSONArray()
      val days = (0 until daysArr.length()).map { daysArr.getInt(it) }
      return Alarm(
        id = o.getString("id"),
        hour = o.optInt("hour", 7),
        minute = o.optInt("minute", 0),
        days = days,
        enabled = o.optBoolean("enabled", true),
        alertMode = o.optString("alertMode", "sound")
      )
    }
  }
}

data class Challenge(val cardId: String, val display: String, val answer: String) {
  fun toJson(): JSONObject = JSONObject().apply {
    put("cardId", cardId)
    put("display", display)
    // answer 는 JS 로 보내지 않는다 — submitAnswer() 로 네이티브에서만 대조한다.
  }
}

class AlarmStore(context: Context) {
  private val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  fun getAll(): List<Alarm> {
    val raw = prefs.getString(KEY_ALARMS, null) ?: return emptyList()
    return try {
      val arr = JSONArray(raw)
      (0 until arr.length()).map { Alarm.fromJson(arr.getJSONObject(it)) }
    } catch (e: Exception) {
      emptyList()
    }
  }

  private fun saveAll(alarms: List<Alarm>) {
    val arr = JSONArray()
    alarms.forEach { arr.put(it.toJson()) }
    prefs.edit().putString(KEY_ALARMS, arr.toString()).apply()
  }

  fun upsert(alarm: Alarm) {
    val next = getAll().filter { it.id != alarm.id } + alarm
    saveAll(next)
  }

  fun delete(id: String) {
    saveAll(getAll().filter { it.id != id })
  }

  fun get(id: String): Alarm? = getAll().find { it.id == id }

  fun setChallenge(challenge: Challenge?) {
    if (challenge == null) {
      prefs.edit().remove(KEY_CHALLENGE).apply()
      return
    }
    prefs.edit().putString(KEY_CHALLENGE, challenge.toJson().put("answer", challenge.answer).toString()).apply()
  }

  fun getChallenge(): Challenge? {
    val raw = prefs.getString(KEY_CHALLENGE, null) ?: return null
    return try {
      val o = JSONObject(raw)
      Challenge(o.getString("cardId"), o.getString("display"), o.getString("answer"))
    } catch (e: Exception) {
      null
    }
  }
}
