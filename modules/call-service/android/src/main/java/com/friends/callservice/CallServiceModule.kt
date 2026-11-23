package com.friends.callservice

import android.content.Intent
import android.os.Build
import io.github.expo.modules.v2.ExpoModule
import io.github.expo.modules.v2.JS
import io.github.expo.modules.v2.Module
import io.github.expo.modules.v2.react.androidContext

@ExpoModule("CallService")
class CallServiceModule : Module() {
  /** Start (or update) the foreground service. Returns false if Android refused it. */
  @JS
  fun start(title: String, text: String): Boolean {
    val intent = Intent(androidContext, CallService::class.java)
      .putExtra(CallService.EXTRA_TITLE, title)
      .putExtra(CallService.EXTRA_TEXT, text)
    return try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) androidContext.startForegroundService(intent)
      else androidContext.startService(intent)
      true
    } catch (e: Exception) {
      false
    }
  }

  @JS
  fun stop() {
    androidContext.stopService(Intent(androidContext, CallService::class.java))
  }
}
