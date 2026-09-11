package expo.modules.todaywidget

import android.content.Context
import android.database.sqlite.SQLiteDatabase
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.text.SimpleDateFormat
import java.util.Locale

// store.js 를 그대로 옮긴 것이다 — 키 이름, 간격표, 채점 공식이 전부 거기와
// 한 글자도 다르면 안 된다. store.js 가 바뀌면 여기도 같이 바꿔야 한다.
//
// AsyncStorage(v2.2.0, RN 신아키텍처)는 이 프로젝트에서 여전히 옛 SQLite
// 백엔드(ReactDatabaseSupplier)를 쓴다 — DB 파일 RKStorage, 테이블
// catalystLocalStorage, 컬럼 key/value. 위젯은 앱과 같은 프로세스에서 돌기
// 때문에(런처로 넘어가는 건 RemoteViews 뿐이다) 이 파일을 그냥 직접 열면 된다.

private const val DB_NAME = "RKStorage"
private const val TABLE = "catalystLocalStorage"

private const val DATA_KEY = "memento/data"
private const val HISTORY_KEY = "memento/history"
private const val SETTINGS_KEY = "memento/settings"

private const val MINUTE = 60_000L
private const val DAY = 24 * 60 * MINUTE
private const val MAX_LEVEL = 5

// store.js 의 INTERVALS 와 정확히 같은 순서·값.
private val INTERVALS = longArrayOf(10 * MINUTE, 1 * DAY, 3 * DAY, 7 * DAY, 16 * DAY, 35 * DAY)

data class DueCard(val id: String, val front: String)

class MementoStore(private val context: Context) {

  // 앱을 한 번도 안 연 상태면 DB 파일 자체가 없다.
  private fun dbFile(): File = context.getDatabasePath(DB_NAME)

  private fun openReadOnly(): SQLiteDatabase? {
    val file = dbFile()
    if (!file.exists()) return null
    return try {
      SQLiteDatabase.openDatabase(file.path, null, SQLiteDatabase.OPEN_READONLY)
    } catch (e: Exception) {
      null
    }
  }

  private fun openReadWrite(): SQLiteDatabase? {
    val file = dbFile()
    if (!file.exists()) return null
    return try {
      SQLiteDatabase.openDatabase(file.path, null, SQLiteDatabase.OPEN_READWRITE)
    } catch (e: Exception) {
      null
    }
  }

  private fun readRaw(db: SQLiteDatabase, key: String): String? {
    db.query(TABLE, arrayOf("value"), "key = ?", arrayOf(key), null, null, null).use { cursor ->
      return if (cursor.moveToFirst()) cursor.getString(0) else null
    }
  }

  private fun writeRaw(db: SQLiteDatabase, key: String, value: String) {
    db.execSQL(
      "INSERT OR REPLACE INTO $TABLE (key, value) VALUES (?, ?);",
      arrayOf(key, value)
    )
  }

  // store.js 의 dateKey() — 기기 로컬 날짜, JS 의 new Date() 와 같은 기준.
  private fun todayKey(): String =
    SimpleDateFormat("yyyy-MM-dd", Locale.US).format(System.currentTimeMillis())

  /**
   * 오늘 볼 카드 중 맨 위(레벨 낮은 것 우선, 그다음 기한 이른 것) 하나와,
   * 오늘 볼 전체 개수(하루 한도 안에서)를 같이 돌려준다.
   * DB 가 아직 없으면 null — 위젯이 "앱을 먼저 열어주세요" 로 보여준다.
   */
  fun peekToday(): Pair<DueCard?, Int>? {
    val db = openReadOnly() ?: return null
    try {
      val dataRaw = readRaw(db, DATA_KEY) ?: return Pair(null, 0)
      val settingsRaw = readRaw(db, SETTINGS_KEY)
      val dailyLimit = settingsRaw?.let { JSONObject(it).optInt("dailyLimit", 60) } ?: 60

      val cards = JSONObject(dataRaw).optJSONArray("cards") ?: JSONArray()
      val now = System.currentTimeMillis()

      val due = mutableListOf<JSONObject>()
      for (i in 0 until cards.length()) {
        val c = cards.getJSONObject(i)
        if (c.optLong("due", 0L) <= now) due.add(c)
      }
      due.sortWith(compareBy({ it.optInt("level", 0) }, { it.optLong("due", 0L) }))

      val top = due.firstOrNull()?.let { DueCard(it.getString("id"), it.optString("front", "")) }
      val count = minOf(due.size, dailyLimit)
      return Pair(top, count)
    } finally {
      db.close()
    }
  }

  // store.js 의 schedule() + gradeCard() 를 합친 것. 성공하면 true.
  fun grade(cardId: String, gradeKey: String): Boolean {
    val db = openReadWrite() ?: return false
    try {
      val dataRaw = readRaw(db, DATA_KEY) ?: return false
      val root = JSONObject(dataRaw)
      val cards = root.optJSONArray("cards") ?: return false

      var target: JSONObject? = null
      var targetIndex = -1
      for (i in 0 until cards.length()) {
        val c = cards.getJSONObject(i)
        if (c.optString("id") == cardId) {
          target = c
          targetIndex = i
          break
        }
      }
      val card = target ?: return false

      val now = System.currentTimeMillis()
      val level = card.optInt("level", 0)
      val reps = card.optInt("reps", 0)
      val lapses = card.optInt("lapses", 0)

      val newLevel: Int
      val due: Long
      val newLapses: Int

      when (gradeKey) {
        "again" -> {
          newLevel = maxOf(0, level - 1)
          due = now + 10 * MINUTE
          newLapses = lapses + 1
        }
        "hard" -> {
          newLevel = level
          due = now + maxOf(10 * MINUTE, (INTERVALS[level] * 0.5).toLong())
          newLapses = lapses
        }
        else -> { // "good"
          newLevel = minOf(MAX_LEVEL, level + 1)
          due = now + INTERVALS[newLevel]
          newLapses = lapses
        }
      }

      card.put("level", newLevel)
      card.put("due", due)
      card.put("reps", reps + 1)
      card.put("lapses", newLapses)
      card.put("lastReviewedAt", now)
      cards.put(targetIndex, card)
      root.put("cards", cards)

      val historyRaw = readRaw(db, HISTORY_KEY)
      val history = if (historyRaw != null) JSONObject(historyRaw) else JSONObject()
      val key = todayKey()
      val day = history.optJSONObject(key) ?: JSONObject().apply {
        put("reviewed", 0)
        put("again", 0)
        put("good", 0)
      }
      day.put("reviewed", day.optInt("reviewed", 0) + 1)
      if (gradeKey == "again") day.put("again", day.optInt("again", 0) + 1)
      if (gradeKey == "good") day.put("good", day.optInt("good", 0) + 1)
      history.put(key, day)

      db.beginTransaction()
      try {
        writeRaw(db, DATA_KEY, root.toString())
        writeRaw(db, HISTORY_KEY, history.toString())
        db.setTransactionSuccessful()
      } finally {
        db.endTransaction()
      }

      return true
    } catch (e: Exception) {
      return false
    } finally {
      db.close()
    }
  }
}
