import 'dart:io';
import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:dio/dio.dart';
import 'package:path_provider/path_provider.dart';
import 'package:open_filex/open_filex.dart';

class UpdateService {
  /// Checks Firestore for the latest app version. If a newer version exists,
  /// displays an update dialog.
  static Future<void> checkForUpdates(BuildContext context) async {
    try {
      final doc = await FirebaseFirestore.instance.collection('app_settings').doc('update_info').get();
      if (!doc.exists) return;

      final data = doc.data()!;
      final latestVersion = data['latest_version'] as String;
      final downloadUrl = data['download_url'] as String;
      final releaseNotes = data['release_notes'] as String? ?? 'Yeni bir sürüm mevcut.';
      final forceUpdate = data['force_update'] as bool? ?? false;

      final packageInfo = await PackageInfo.fromPlatform();
      final currentVersion = packageInfo.version;
      
      print("Update check - Current: $currentVersion, Latest: $latestVersion");

      if (_isUpdateAvailable(currentVersion, latestVersion)) {
        if (context.mounted) {
          _showUpdateDialog(context, latestVersion, downloadUrl, releaseNotes, forceUpdate);
        }
      }
    } catch (e) {
      print('Update check failed: $e');
    }
  }

  /// Compares current version with latest version (e.g. 1.0.0 vs 1.0.1)
  static bool _isUpdateAvailable(String currentVersion, String latestVersion) {
    try {
      List<int> currentParts = currentVersion.split('.').map((s) => int.tryParse(s) ?? 0).toList();
      List<int> latestParts = latestVersion.split('.').map((s) => int.tryParse(s) ?? 0).toList();

      for (int i = 0; i < 3; i++) {
        int current = i < currentParts.length ? currentParts[i] : 0;
        int latest = i < latestParts.length ? latestParts[i] : 0;
        if (latest > current) return true;
        if (latest < current) return false;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  static void _showUpdateDialog(BuildContext context, String version, String url, String notes, bool force) {
    showDialog(
      context: context,
      barrierDismissible: !force,
      builder: (context) {
        return PopScope(
          canPop: !force,
          child: AlertDialog(
            title: Row(
              children: [
                Icon(Icons.system_update, color: Colors.blue),
                SizedBox(width: 10),
                Text('Yeni Sürüm ($version)'),
              ],
            ),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text("Uygulamanın yeni bir sürümü yayınlandı.", style: TextStyle(fontWeight: FontWeight.bold)),
                  SizedBox(height: 10),
                  Text(notes),
                ],
              ),
            ),
            actions: [
              if (!force)
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: Text('Sonra Hatırlat', style: TextStyle(color: Colors.grey)),
                ),
              ElevatedButton.icon(
                icon: Icon(Icons.download),
                label: Text('Güncelle'),
                onPressed: () {
                  Navigator.pop(context);
                  _downloadAndInstall(context, url);
                },
              ),
            ],
          ),
        );
      },
    );
  }

  static Future<void> _downloadAndInstall(BuildContext context, String url) async {
    ValueNotifier<double> progressNotifier = ValueNotifier(0.0);

    // Show progress dialog
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) {
        return PopScope(
          canPop: false,
          child: AlertDialog(
            title: Row(
              children: [
                CircularProgressIndicator(),
                SizedBox(width: 15),
                Text('Güncelleme İndiriliyor'),
              ],
            ),
            content: ValueListenableBuilder<double>(
              valueListenable: progressNotifier,
              builder: (context, progress, child) {
                return Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    LinearProgressIndicator(value: progress),
                    SizedBox(height: 15),
                    Text('%${(progress * 100).toStringAsFixed(1)} tamamlandı', style: TextStyle(fontSize: 16)),
                    SizedBox(height: 5),
                    Text('Lütfen uygulamayı kapatmayın.', style: TextStyle(color: Colors.grey, fontSize: 13)),
                  ],
                );
              },
            ),
          ),
        );
      },
    );

    try {
      Directory tempDir = await getTemporaryDirectory();
      String savePath = '${tempDir.path}/okul_otomat_update.apk';
      
      Dio dio = Dio();
      
      // Configure Dio to follow redirects (which GitHub uses)
      await dio.download(
        url, 
        savePath, 
        onReceiveProgress: (received, total) {
          if (total != -1) {
            progressNotifier.value = received / total;
          }
        },
        options: Options(
          followRedirects: true,
          validateStatus: (status) {
            return status != null && status < 500;
          },
        ),
      );
      
      // Close the download progress dialog
      if (context.mounted) {
        Navigator.pop(context); 
      }
      
      // Open the APK to start the installer
      final result = await OpenFilex.open(savePath);
      
      if (result.type != ResultType.done) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Yükleme başlatılamadı: ${result.message}')),
          );
        }
      }
    } catch (e) {
      if (context.mounted) {
        Navigator.pop(context); // Close the progress dialog
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('İndirme sırasında bir hata oluştu: $e')),
        );
      }
    }
  }
}
