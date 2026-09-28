package expo.modules.alarmring

import android.content.Context
import android.database.sqlite.SQLiteDatabase
import org.json.JSONObject
import java.io.File

// today-widget 의 MementoStore.kt 와 같은 방식으로 메멘토의 카드 데이터를
// 직접 읽는다(같은 앱 프로세스라 파일을 그냥 열 수 있다) — 채점은 하지 않고
// 읽기 전용으로 카드 하나를 무작위로 뽑아 빈칸 문제를 만들 뿐이라 훨씬 간단하다.

private const val DB_NAME = "RKStorage"
private const val TABLE = "catalystLocalStorage"
private const val DATA_KEY = "memento/data"

data class BlankQuestion(val cardId: String, val display: String, val answer: String)

object RandomCardPicker {

  // 문장 부호만 있는 토큰은 빈칸으로 만들 의미가 없어서 뺀다.
  private fun isBlankable(token: String): Boolean = token.any { it.isLetterOrDigit() }

  fun pick(context: Context): BlankQuestion? {
    val file = context.getDatabasePath(DB_NAME)
    if (!file.exists()) return null

    val db = try {
      SQLiteDatabase.openDatabase(file.path, null, SQLiteDatabase.OPEN_READONLY)
    } catch (e: Exception) {
      return null
    }

    try {
      val dataRaw = db.query(TABLE, arrayOf("value"), "key = ?", arrayOf(DATA_KEY), null, null, null)
        .use { cursor -> if (cursor.moveToFirst()) cursor.getString(0) else null } ?: return null

      val cards = JSONObject(dataRaw).optJSONArray("cards") ?: return null
      if (cards.length() == 0) return null

      // 앞면이 실제로 단어를 하나라도 가진 카드만 후보로 삼는다.
      val candidates = (0 until cards.length())
        .map { cards.getJSONObject(it) }
        .filter { it.optString("front", "").trim().split(Regex("\\s+")).any(::isBlankable) }
      if (candidates.isEmpty()) return null

      val card = candidates.random()
      val front = card.getString("front").trim()
      val words = front.split(Regex("(?<=\\s)|(?=\\s)")) // 공백을 살려 다시 이어붙일 수 있게 나눈다.
      val blankableIndices = words.indices.filter { isBlankable(words[it]) }
      val targetIndex = blankableIndices.random()
      val answer = words[targetIndex]

      val blank = "＿".repeat(answer.trim().length.coerceIn(2, 6))
      val display = words.toMutableList().also { it[targetIndex] = blank }.joinToString("")

      return BlankQuestion(card.getString("id"), display, answer.trim())
    } catch (e: Exception) {
      return null
    } finally {
      db.close()
    }
  }
}
