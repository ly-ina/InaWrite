package com.inakb.novel;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import androidx.core.content.FileProvider;
import com.getcapacitor.BridgeActivity;
import java.io.File;

public class MainActivity extends BridgeActivity {

    @Override
    public void onStart() {
        super.onStart();
        // 注册 JavaScript Interface 到 WebView
        WebView webView = getBridge().getWebView();
        webView.addJavascriptInterface(new UpdateInstaller(), "AndroidUpdateInstaller");
    }

    /**
     * 提供给前端调用的 APK 安装接口
     * 使用 FileProvider 分享 APK URI，触发系统安装器覆盖安装
     */
    public class UpdateInstaller {
        @JavascriptInterface
        public void installApk(String filePath) {
            try {
                File apkFile = new File(filePath);
                if (!apkFile.exists()) {
                    android.util.Log.e("InaKBUpdate", "APK file not found: " + filePath);
                    return;
                }

                Uri apkUri;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                    // Android 7.0+ 使用 FileProvider
                    apkUri = FileProvider.getUriForFile(
                        MainActivity.this,
                        getApplicationContext().getPackageName() + ".fileprovider",
                        apkFile
                    );
                } else {
                    apkUri = Uri.fromFile(apkFile);
                }

                Intent intent = new Intent(Intent.ACTION_VIEW);
                intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
                intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

                MainActivity.this.startActivity(intent);
            } catch (Exception e) {
                android.util.Log.e("InaKBUpdate", "Failed to install APK", e);
            }
        }
    }
}
