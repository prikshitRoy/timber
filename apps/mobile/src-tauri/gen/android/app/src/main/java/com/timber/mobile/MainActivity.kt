package com.timber.mobile

import android.content.Intent
import android.os.Bundle
import android.webkit.JavascriptInterface
import android.webkit.WebView
import androidx.activity.enableEdgeToEdge
import org.json.JSONObject

class MainActivity : TauriActivity() {
  private var webViewRef: WebView? = null

  @Volatile
  private var pendingShareJson: String? = null

  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)
    captureShareIntent(intent)
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
    if (captureShareIntent(intent)) {
      notifyWebViewOfShare()
    }
  }

  override fun onWebViewCreate(webView: WebView) {
    super.onWebViewCreate(webView)
    webViewRef = webView
    webView.addJavascriptInterface(TimberShareBridge(), "TimberAndroidShare")
    webView.addJavascriptInterface(BrowserBridge(this), "TimberAndroidBrowser")
  }

  private fun captureShareIntent(incoming: Intent?): Boolean {
    if (incoming?.action != Intent.ACTION_SEND) return false
    if (incoming.type?.startsWith("text/") != true) return false

    val sharedText = incoming.getStringExtra(Intent.EXTRA_TEXT)?.trim().orEmpty()
    if (sharedText.isEmpty()) return false

    val sharedSubject =
      incoming.getStringExtra(Intent.EXTRA_SUBJECT)?.trim()
        ?: incoming.getStringExtra(Intent.EXTRA_TITLE)?.trim()
        ?: ""

    val payload = JSONObject().apply {
      put("text", sharedText)
      put("subject", sharedSubject)
    }

    synchronized(this) {
      pendingShareJson = payload.toString()
    }

    // Clear the action so configuration changes don't replay the same share popup
    incoming.action = null
    return true
  }

  private fun notifyWebViewOfShare() {
    val wv = webViewRef ?: return
    wv.post {
      wv.evaluateJavascript(
        "window.dispatchEvent(new Event('timber:share-intent'));",
        null
      )
    }
  }

  inner class TimberShareBridge {
    @JavascriptInterface
    fun consumePendingShare(): String? {
      synchronized(this@MainActivity) {
        val current = pendingShareJson
        pendingShareJson = null
        return current
      }
    }
  }
}
