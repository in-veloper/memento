package expo.modules.alarmring

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager

private const val CHANNEL_ID = "alarm_ring"
private const val NOTIFICATION_ID = 8420
private val VIBRATE_PATTERN = longArrayOf(0, 500, 500) // 대기, 진동, 쉼 — 반복

// 알람이 울릴 때 뜨는 포그라운드 서비스 — 문제를 뽑아 저장해 두고, 잠금화면
// 위로 풀스크린 알림을 띄우고, 알람별로 정한 방식(소리/진동/둘 다)으로 알린다.
// JS(React Native)가 전혀 안 떠 있어도(앱을 껐어도) 이 서비스는 안드로이드가
// 직접 띄워 주는 것이라 정상 동작한다 — 화면(정답 맞히기)만 React Native 쪽으로 넘긴다.
class AlarmRingService : Service() {
  private var player: MediaPlayer? = null
  private var wakeLock: PowerManager.WakeLock? = null
  private var vibrator: Vibrator? = null

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val alarmId = intent?.getStringExtra(EXTRA_ALARM_ID)
    val alarm = alarmId?.let { AlarmStore(this).get(it) }
    val alertMode = alarm?.alertMode ?: "sound"

    val store = AlarmStore(this)
    val question = RandomCardPicker.pick(this)
    store.setChallenge(
      if (question != null) Challenge(question.cardId, question.display, question.answer) else null
    )

    startForeground(NOTIFICATION_ID, buildNotification())
    acquireWakeLock()
    if (alertMode == "sound" || alertMode == "both") playSound()
    if (alertMode == "vibrate" || alertMode == "both") startVibration()

    return START_STICKY
  }

  override fun onDestroy() {
    player?.let { runCatching { it.stop() } }
    player?.release()
    player = null
    vibrator?.cancel()
    vibrator = null
    wakeLock?.let { if (it.isHeld) it.release() }
    wakeLock = null
    super.onDestroy()
  }

  private fun startVibration() {
    vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      (getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager).defaultVibrator
    } else {
      @Suppress("DEPRECATION")
      getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
    }
    vibrator?.vibrate(VibrationEffect.createWaveform(VIBRATE_PATTERN, 1))
  }

  private fun acquireWakeLock() {
    val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
    wakeLock = pm.newWakeLock(
      PowerManager.PARTIAL_WAKE_LOCK or PowerManager.ACQUIRE_CAUSES_WAKEUP,
      "alarmring:ring"
    ).apply { acquire(10 * 60 * 1000L) } // 최대 10분 — 문제를 못 풀고 방치돼도 배터리를 끝없이 잡아먹지 않게.
  }

  private fun playSound() {
    val uri: Uri = RingtoneManager.getActualDefaultRingtoneUri(this, RingtoneManager.TYPE_ALARM)
      ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
    player = MediaPlayer().apply {
      setAudioAttributes(
        AudioAttributes.Builder()
          .setUsage(AudioAttributes.USAGE_ALARM)
          .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
          .build()
      )
      isLooping = true
      try {
        setDataSource(this@AlarmRingService, uri)
        prepare()
        start()
      } catch (e: Exception) {
        // 소리가 안 나도 화면(풀스크린 알림)은 이미 떠서 알람 자체는 작동한다.
      }
    }
  }

  private fun buildNotification(): Notification {
    val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val existing = nm.getNotificationChannel(CHANNEL_ID)
      if (existing == null) {
        val channel = NotificationChannel(CHANNEL_ID, "알람", NotificationManager.IMPORTANCE_HIGH).apply {
          description = "메멘토 빈칸 알람"
          setSound(null, null) // 소리는 MediaPlayer 로 직접 낸다 — 알림음과 겹치지 않게.
          enableVibration(false) // 진동도 알람 설정(alertMode)에 따라 직접 낸다 — 채널 기본 진동과 안 겹치게.
        }
        nm.createNotificationChannel(channel)
      }
    }

    val fullScreenIntent = Intent(Intent.ACTION_VIEW, Uri.parse("memento://alarm")).apply {
      setPackage(packageName)
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
    }
    val fullScreenPending = PendingIntent.getActivity(
      this, 0, fullScreenIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )

    val notification = Notification.Builder(this, CHANNEL_ID)
      .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
      .setContentTitle("빈칸을 채워야 알람이 꺼져요")
      .setContentText("메멘토를 열어 문제를 풀어주세요")
      .setCategory(Notification.CATEGORY_ALARM)
      .setPriority(Notification.PRIORITY_MAX)
      .setFullScreenIntent(fullScreenPending, true)
      .setContentIntent(fullScreenPending)
      .setOngoing(true)
      .build()
    // setOngoing(true) 만으로는 "전체 삭제"에 안 지워진다는 보장이 없어서
    // FLAG_NO_CLEAR 를 직접 더한다 — 알림을 지워버리면 문제 화면으로
    // 돌아갈 방법이 없어지는 걸 막기 위한 안전장치.
    notification.flags = notification.flags or Notification.FLAG_NO_CLEAR
    return notification
  }

  companion object {
    fun stop(context: Context) {
      context.stopService(Intent(context, AlarmRingService::class.java))
      val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      nm.cancel(NOTIFICATION_ID)
    }
  }
}
