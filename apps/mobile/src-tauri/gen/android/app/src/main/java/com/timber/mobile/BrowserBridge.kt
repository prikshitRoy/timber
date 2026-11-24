package com.timber.mobile

import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ResolveInfo
import android.net.Uri
import android.os.Build
import android.webkit.JavascriptInterface
import org.json.JSONArray
import org.json.JSONObject

/**
 * WebView JavaScript bridge exposing installed Android browsers and targeted URL launching.
 */
class BrowserBridge(private val activity: Activity) {

  /**
   * Return a JSON array of installed web browsers with packageName, label, and isSystemDefault.
   */
  @JavascriptInterface
  fun getInstalledBrowsers(): String {
    val pm = activity.packageManager
    val httpsIntent = createBrowserProbeIntent("https://example.com")
    val httpIntent = createBrowserProbeIntent("http://example.com")

    val defaultPackage = resolveDefaultBrowserPackage(pm, httpsIntent)
      ?: resolveDefaultBrowserPackage(pm, httpIntent)

    val seenPackages = LinkedHashSet<String>()
    val candidates = mutableListOf<Triple<String, String, Boolean>>()

    val resolvedList = queryActivitiesCompat(pm, httpsIntent) + queryActivitiesCompat(pm, httpIntent)
    for (info in resolvedList) {
      val activityInfo = info.activityInfo ?: continue
      if (!activityInfo.exported) continue

      val pkg = activityInfo.packageName ?: continue
      if (pkg == activity.packageName || pkg == ANDROID_RESOLVER_PACKAGE) continue
      if (!seenPackages.add(pkg)) continue

      val appLabel = pm.getApplicationLabel(activityInfo.applicationInfo)?.toString()?.trim()
      val fallbackLabel = info.loadLabel(pm)?.toString()?.trim()
      val label = appLabel.takeUnless { it.isNullOrEmpty() }
        ?: fallbackLabel.takeUnless { it.isNullOrEmpty() }
        ?: pkg

      candidates.add(Triple(pkg, label, pkg == defaultPackage))
    }

    // Place the system default browser first, then sort remaining browsers alphabetically.
    candidates.sortWith(
      compareByDescending<Triple<String, String, Boolean>> { it.third }
        .thenBy { it.second.lowercase() }
    )

    val result = JSONArray()
    for ((pkg, label, isDefault) in candidates) {
      val item = JSONObject().apply {
        put("packageName", pkg)
        put("label", label)
        put("isSystemDefault", isDefault)
      }
      result.put(item)
    }

    return result.toString()
  }

  /**
   * Launch an http(s) URL in the specified browser package, or the OS default if packageName is blank.
   */
  @JavascriptInterface
  fun openUrlInBrowser(url: String, packageName: String): Boolean {
    val trimmedUrl = url.trim()
    if (!isSupportedWebUrl(trimmedUrl)) return false

    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(trimmedUrl)).apply {
      addCategory(Intent.CATEGORY_BROWSABLE)
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      if (packageName.isNotBlank()) {
        setPackage(packageName.trim())
      }
    }

    return try {
      activity.startActivity(intent)
      true
    } catch (_: ActivityNotFoundException) {
      false
    } catch (_: SecurityException) {
      false
    }
  }

  private fun createBrowserProbeIntent(probeUrl: String): Intent {
    return Intent(Intent.ACTION_VIEW, Uri.parse(probeUrl)).apply {
      addCategory(Intent.CATEGORY_BROWSABLE)
    }
  }

  private fun isSupportedWebUrl(url: String): Boolean {
    val lower = url.lowercase()
    return lower.startsWith("https://") || lower.startsWith("http://")
  }

  private fun resolveDefaultBrowserPackage(pm: PackageManager, intent: Intent): String? {
    val resolveInfo = resolveActivityCompat(pm, intent) ?: return null
    val pkg = resolveInfo.activityInfo?.packageName ?: return null
    if (pkg == ANDROID_RESOLVER_PACKAGE || pkg == activity.packageName) return null
    return pkg
  }

  private fun queryActivitiesCompat(pm: PackageManager, intent: Intent): List<ResolveInfo> {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      pm.queryIntentActivities(
        intent,
        PackageManager.ResolveInfoFlags.of(PackageManager.MATCH_ALL.toLong())
      )
    } else {
      @Suppress("DEPRECATION")
      pm.queryIntentActivities(intent, PackageManager.MATCH_ALL)
    }
  }

  private fun resolveActivityCompat(pm: PackageManager, intent: Intent): ResolveInfo? {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      pm.resolveActivity(
        intent,
        PackageManager.ResolveInfoFlags.of(PackageManager.MATCH_DEFAULT_ONLY.toLong())
      )
    } else {
      @Suppress("DEPRECATION")
      pm.resolveActivity(intent, PackageManager.MATCH_DEFAULT_ONLY)
    }
  }

  companion object {
    // Android's disambiguation chooser package returned when no system default browser is set.
    private const val ANDROID_RESOLVER_PACKAGE = "android"
  }
}
