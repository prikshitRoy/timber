package com.timber.mobile

import android.os.Bundle
import android.view.View
import android.widget.ArrayAdapter
import android.widget.Spinner
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.google.android.material.bottomsheet.BottomSheetBehavior
import com.google.android.material.bottomsheet.BottomSheetDialog
import com.google.android.material.button.MaterialButton
import com.google.android.material.textfield.TextInputEditText
import com.google.android.material.textfield.TextInputLayout

/**
 * Translucent popup activity that renders a native Material bottom sheet directly
 * over the calling app so users can save shared URLs without leaving their current app.
 */
class ShareActivity : AppCompatActivity() {

  private var sheetDialog: BottomSheetDialog? = null

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    val extracted = ShareStorage.extractSharedLink(this, intent)
    if (extracted == null) {
      Toast.makeText(this, "No shareable link found.", Toast.LENGTH_SHORT).show()
      finish()
      return
    }

    showShareBottomSheet(extracted)
  }

  override fun onDestroy() {
    sheetDialog?.setOnDismissListener(null)
    sheetDialog?.dismiss()
    sheetDialog = null
    super.onDestroy()
  }

  private fun showShareBottomSheet(extracted: ExtractedShareData) {
    val dialog = BottomSheetDialog(this)
    val contentView = layoutInflater.inflate(R.layout.dialog_share_link, null)
    dialog.setContentView(contentView)

    dialog.behavior.state = BottomSheetBehavior.STATE_EXPANDED
    dialog.behavior.skipCollapsed = true

    val urlInput = contentView.findViewById<TextInputEditText>(R.id.share_input_url)
    val titleInput = contentView.findViewById<TextInputEditText>(R.id.share_input_title)
    val folderSpinner = contentView.findViewById<Spinner>(R.id.share_spinner_folder)
    val newFolderLayout = contentView.findViewById<TextInputLayout>(R.id.share_layout_new_folder)
    val newFolderInput = contentView.findViewById<TextInputEditText>(R.id.share_input_new_folder)
    val toggleFolderBtn = contentView.findViewById<MaterialButton>(R.id.share_btn_toggle_folder_mode)
    val errorText = contentView.findViewById<TextView>(R.id.share_text_error)
    val closeBtn = contentView.findViewById<MaterialButton>(R.id.share_btn_close)
    val cancelBtn = contentView.findViewById<MaterialButton>(R.id.share_btn_cancel)
    val saveBtn = contentView.findViewById<MaterialButton>(R.id.share_btn_save)

    urlInput.setText(extracted.url)
    titleInput.setText(extracted.title)

    val cachedFolders = ShareStorage.getCachedFolders(this)
    val dropdownLabels = listOf("Root Grid") + cachedFolders.map { it.label }
    val adapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, dropdownLabels)
    folderSpinner.adapter = adapter

    var isCreatingNewFolder = false

    toggleFolderBtn.setOnClickListener {
      isCreatingNewFolder = !isCreatingNewFolder
      folderSpinner.visibility = if (isCreatingNewFolder) View.GONE else View.VISIBLE
      newFolderLayout.visibility = if (isCreatingNewFolder) View.VISIBLE else View.GONE
      toggleFolderBtn.text = if (isCreatingNewFolder) "Use existing" else "+ New folder"
      if (isCreatingNewFolder) {
        newFolderInput.requestFocus()
      } else {
        newFolderInput.setText("")
      }
      errorText.visibility = View.GONE
    }

    val dismissPopup = View.OnClickListener { dialog.dismiss() }
    closeBtn.setOnClickListener(dismissPopup)
    cancelBtn.setOnClickListener(dismissPopup)

    saveBtn.setOnClickListener {
      val trimmedUrl = urlInput.text?.toString()?.trim().orEmpty()
      val trimmedTitle = titleInput.text?.toString()?.trim().orEmpty()
      val trimmedNewFolder = newFolderInput.text?.toString()?.trim().orEmpty()

      if (!isSupportedWebUrl(trimmedUrl)) {
        errorText.text = "Please enter a valid http:// or https:// URL."
        errorText.visibility = View.VISIBLE
        return@setOnClickListener
      }

      if (isCreatingNewFolder && trimmedNewFolder.isEmpty()) {
        errorText.text = "Please enter a folder name."
        errorText.visibility = View.VISIBLE
        return@setOnClickListener
      }

      val selectedIndex = folderSpinner.selectedItemPosition
      val selectedFolderId =
        if (!isCreatingNewFolder && selectedIndex > 0) {
          cachedFolders[selectedIndex - 1].id
        } else {
          null
        }

      ShareStorage.enqueueSave(
        context = applicationContext,
        url = trimmedUrl,
        title = trimmedTitle.ifEmpty { trimmedUrl },
        folderId = selectedFolderId,
        newFolderName = if (isCreatingNewFolder) trimmedNewFolder else null,
      )

      Toast.makeText(applicationContext, "Saved to Timber", Toast.LENGTH_SHORT).show()
      dialog.dismiss()
    }

    dialog.setOnDismissListener {
      if (!isFinishing) {
        finish()
        overridePendingTransition(0, 0)
      }
    }

    sheetDialog = dialog
    dialog.show()
  }

  private fun isSupportedWebUrl(url: String): Boolean {
    val lower = url.lowercase()
    return lower.startsWith("https://") || lower.startsWith("http://")
  }
}
