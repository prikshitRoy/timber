package com.timber.mobile

import android.os.Bundle
import android.webkit.JavascriptInterface
import android.webkit.WebView
import androidx.activity.enableEdgeToEdge

class MainActivity : TauriActivity() {
  private var webViewRef: WebView? = null

  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)

    // Silently notify the live WebView when ShareActivity queues a link in the background.
    ShareStorage.setOnSaveQueuedListener {
      notifyWebViewOfPendingSaves()
    }
  }

  override fun onDestroy() {
    ShareStorage.setOnSaveQueuedListener(null)
    webViewRef = null
    super.onDestroy()
  }

  override fun onWebViewCreate(webView: WebView) {
    super.onWebViewCreate(webView)
    webViewRef = webView
    webView.addJavascriptInterface(TimberShareBridge(), "TimberAndroidShare")
    webView.addJavascriptInterface(BrowserBridge(this), "TimberAndroidBrowser")
  }

  private fun notifyWebViewOfPendingSaves() {
    val wv = webViewRef ?: return
    wv.post {
      wv.evaluateJavascript(
        "window.dispatchEvent(new Event('timber:pending-saves'));",
        null
      )
    }
  }

  inner class TimberShareBridge {
    @JavascriptInterface
    fun consumePendingSaves(): String? {
      return ShareStorage.consumePendingSavesJson(applicationContext)
    }

    @JavascriptInterface
    fun syncFolders(foldersJson: String) {
      ShareStorage.saveSyncedFoldersJson(applicationContext, foldersJson)
    }
  }
}
