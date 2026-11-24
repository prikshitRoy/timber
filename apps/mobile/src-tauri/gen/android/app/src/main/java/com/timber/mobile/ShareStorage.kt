package com.timber.mobile

import android.content.Context
import android.content.Intent
import org.json.JSONArray
import org.json.JSONObject

data class CachedFolderOption(
  val id: String,
  val label: String,
)

data class ExtractedShareData(
  val url: String,
  val title: String,
)

/**
 * Thread-safe SharedPreferences store for mirroring Timber folders to ShareActivity
 * and queuing quick-saved links until the Timber WebView commits them to localStorage.
 */
object ShareStorage {
  private const val PREFS_NAME = "timber_share_prefs"
  private const val KEY_FOLDERS = "synced_folders_json"
  private const val KEY_PENDING_SAVES = "pending_saves_json"
  private const val PENDING_FOLDER_PREFIX = "pending:"

  private val lock = Any()
  private val urlRegex = Regex("""https?://[^\s<>"{}|\\^`\[\]]+""", RegexOption.IGNORE_CASE)

  @Volatile
  private var onSaveQueuedListener: (() -> Unit)? = null

  fun setOnSaveQueuedListener(listener: (() -> Unit)?) {
    onSaveQueuedListener = listener
  }

  /**
   * Extract the first http(s) URL and fallback title from EXTRA_TEXT, EXTRA_HTML_TEXT, ClipData, or intent.data.
   */
  fun extractSharedLink(context: Context, intent: Intent?): ExtractedShareData? {
    if (intent?.action != Intent.ACTION_SEND) return null

    val rawText = readRawSharedText(context, intent)
    if (rawText.isEmpty()) return null

    val match = urlRegex.find(rawText)
    val extractedUrl =
      match?.value?.trimEnd('.', ',', '!', '?', ';', ':', ')', ']') ?: rawText

    val subject =
      intent.getStringExtra(Intent.EXTRA_SUBJECT)?.trim()?.takeIf { it.isNotEmpty() }
        ?: intent.getStringExtra(Intent.EXTRA_TITLE)?.trim()?.takeIf { it.isNotEmpty() }
        ?: ""

    val textWithoutUrl =
      if (match != null) rawText.replace(match.value, "").trim() else ""

    val title = subject.ifEmpty { textWithoutUrl.ifEmpty { extractedUrl } }
    return ExtractedShareData(url = extractedUrl, title = title)
  }

  /**
   * Save the latest Timber folder dropdown options synced from the WebView.
   */
  fun saveSyncedFoldersJson(context: Context, foldersJson: String) {
    synchronized(lock) {
      context
        .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        .edit()
        .putString(KEY_FOLDERS, foldersJson)
        .apply()
    }
  }

  /**
   * Return the cached folder list for the native ShareActivity dropdown.
   */
  fun getCachedFolders(context: Context): List<CachedFolderOption> {
    val raw = synchronized(lock) {
      context
        .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        .getString(KEY_FOLDERS, null)
    } ?: return emptyList()

    return try {
      val array = JSONArray(raw)
      buildList {
        for (i in 0 until array.length()) {
          val obj = array.optJSONObject(i) ?: continue
          val id = obj.optString("id").trim()
          val label = obj.optString("label").trim()
          if (id.isNotEmpty() && label.isNotEmpty()) {
            add(CachedFolderOption(id = id, label = label))
          }
        }
      }
    } catch (_: Exception) {
      emptyList()
    }
  }

  /**
   * Queue a link saved from ShareActivity and optimistically cache any newly created folder name.
   */
  fun enqueueSave(
    context: Context,
    url: String,
    title: String,
    folderId: String?,
    newFolderName: String?,
  ) {
    synchronized(lock) {
      val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      val existingRaw = prefs.getString(KEY_PENDING_SAVES, "[]") ?: "[]"
      val queue = try {
        JSONArray(existingRaw)
      } catch (_: Exception) {
        JSONArray()
      }

      val item = JSONObject().apply {
        put("url", url)
        put("title", title)
        if (!folderId.isNullOrBlank()) put("folderId", folderId)
        if (!newFolderName.isNullOrBlank()) put("newFolderName", newFolderName)
      }
      queue.put(item)

      val editor = prefs.edit().putString(KEY_PENDING_SAVES, queue.toString())

      // Optimistically add new folder to the cached dropdown so back-to-back shares see it immediately.
      if (!newFolderName.isNullOrBlank()) {
        val updatedFolders = appendPendingFolderIfMissing(
          prefs.getString(KEY_FOLDERS, "[]") ?: "[]",
          newFolderName.trim()
        )
        editor.putString(KEY_FOLDERS, updatedFolders)
      }

      editor.apply()
    }

    onSaveQueuedListener?.invoke()
  }

  /**
   * Atomically read and clear all pending saves queued by ShareActivity.
   */
  fun consumePendingSavesJson(context: Context): String? {
    synchronized(lock) {
      val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      val raw = prefs.getString(KEY_PENDING_SAVES, null) ?: return null
      prefs.edit().remove(KEY_PENDING_SAVES).apply()
      return raw
    }
  }

  private fun readRawSharedText(context: Context, intent: Intent): String {
    val extraText = intent.getStringExtra(Intent.EXTRA_TEXT)?.trim().orEmpty()
    if (extraText.isNotEmpty()) return extraText

    val htmlText = intent.getStringExtra(Intent.EXTRA_HTML_TEXT)?.trim().orEmpty()
    if (htmlText.isNotEmpty()) return htmlText

    val clip = intent.clipData
    if (clip != null && clip.itemCount > 0) {
      val coerced = clip.getItemAt(0)?.coerceToText(context)?.toString()?.trim().orEmpty()
      if (coerced.isNotEmpty()) return coerced
    }

    return intent.dataString?.trim().orEmpty()
  }

  private fun appendPendingFolderIfMissing(existingJson: String, folderName: String): String {
    val array = try {
      JSONArray(existingJson)
    } catch (_: Exception) {
      JSONArray()
    }

    for (i in 0 until array.length()) {
      val label = array.optJSONObject(i)?.optString("label")?.trim()
      if (label.equals(folderName, ignoreCase = true)) {
        return array.toString()
      }
    }

    array.put(
      JSONObject().apply {
        put("id", "$PENDING_FOLDER_PREFIX$folderName")
        put("label", folderName)
      }
    )
    return array.toString()
  }
}
