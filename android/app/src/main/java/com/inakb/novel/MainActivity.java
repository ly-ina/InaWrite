package com.inakb.novel;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import androidx.core.content.FileProvider;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

public class MainActivity extends BridgeActivity {

    @Override
    public void onStart() {
        super.onStart();
        WebView webView = getBridge().getWebView();
        webView.addJavascriptInterface(new UpdateInstaller(), "AndroidUpdateInstaller");
    }

    public class UpdateInstaller {
        /**
         * 原生下载 APK 并安装（绕过 WebView 的网络限制）
         * 前端调用: AndroidUpdateInstaller.downloadAndInstall(url)
         * 回调: window.__inakbDownloadProgress(pct) 和 window.__inakbDownloadDone()
         */
        @JavascriptInterface
        public void downloadAndInstall(final String downloadUrl) {
            new Thread(() -> {
                try {
                    android.util.Log.i("InaKBUpdate", "Downloading: " + downloadUrl);
                    URL url = new URL(downloadUrl);
                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    conn.setInstanceFollowRedirects(true);
                    conn.setRequestProperty("User-Agent", "InaKB");
                    conn.setConnectTimeout(30000);
                    conn.setReadTimeout(120000);
                    conn.connect();

                    if (conn.getResponseCode() != HttpURLConnection.HTTP_OK) {
                        android.util.Log.e("InaKBUpdate", "HTTP " + conn.getResponseCode());
                        evalJS("window.__inakbDownloadError&&window.__inakbDownloadError('HTTP " + conn.getResponseCode() + "')");
                        return;
                    }

                    int total = conn.getContentLength();
                    File dir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                    if (!dir.exists()) dir.mkdirs();
                    File apkFile = new File(dir, "InaKB-update.apk");

                    InputStream in = conn.getInputStream();
                    FileOutputStream out = new FileOutputStream(apkFile);
                    byte[] buf = new byte[8192];
                    int len, downloaded = 0;
                    int lastPct = 0;
                    while ((len = in.read(buf)) > 0) {
                        out.write(buf, 0, len);
                        downloaded += len;
                        if (total > 0) {
                            int pct = downloaded * 100 / total;
                            if (pct > lastPct) {
                                lastPct = pct;
                                final int fpct = pct;
                                runOnUiThread(() -> evalJS("window.__inakbDownloadProgress&&window.__inakbDownloadProgress(" + fpct + ")"));
                            }
                        }
                    }
                    out.close();
                    in.close();
                    conn.disconnect();

                    android.util.Log.i("InaKBUpdate", "Downloaded: " + apkFile.getAbsolutePath());

                    runOnUiThread(() -> {
                        evalJS("window.__inakbDownloadDone&&window.__inakbDownloadDone()");
                        installApk(apkFile.getAbsolutePath());
                    });
                } catch (Exception e) {
                    android.util.Log.e("InaKBUpdate", "Download failed", e);
                    final String err = e.getMessage();
                    runOnUiThread(() -> evalJS("window.__inakbDownloadError&&window.__inakbDownloadError('" + err + "')"));
                }
            }).start();
        }

        private void evalJS(String js) {
            WebView wv = getBridge().getWebView();
            if (wv != null) {
                wv.post(() -> wv.evaluateJavascript(js, null));
            }
        }

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
