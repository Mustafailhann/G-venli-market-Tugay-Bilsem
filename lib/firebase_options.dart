import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, kIsWeb, TargetPlatform;

class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) {
      return web;
    }
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
        throw UnsupportedError(
          'DefaultFirebaseOptions have not been configured for ios - '
          'you can reconfigure this by running the FlutterFire CLI again.',
        );
      case TargetPlatform.macOS:
        throw UnsupportedError(
          'DefaultFirebaseOptions have not been configured for macos - '
          'you can reconfigure this by running the FlutterFire CLI again.',
        );
      case TargetPlatform.windows:
        throw UnsupportedError(
          'DefaultFirebaseOptions have not been configured for windows - '
          'you can reconfigure this by running the FlutterFire CLI again.',
        );
      case TargetPlatform.linux:
        throw UnsupportedError(
          'DefaultFirebaseOptions have not been configured for linux - '
          'you can reconfigure this by running the FlutterFire CLI again.',
        );
      default:
        throw UnsupportedError(
          'DefaultFirebaseOptions are not supported for this platform.',
        );
    }
  }

  static const FirebaseOptions web = FirebaseOptions(
    apiKey: 'AIzaSyAaPPMQ8RUv-o3qFAXqgNWSXj9krHb-kIc',
    appId: '1:851412613125:web:777f903bd2d93e80ae446c',
    messagingSenderId: '851412613125',
    projectId: 'okul-otomat-projesi',
    authDomain: 'okul-otomat-projesi.firebaseapp.com',
    storageBucket: 'okul-otomat-projesi.firebasestorage.app',
  );

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyAaPPMQ8RUv-o3qFAXqgNWSXj9krHb-kIc',
    appId: '1:851412613125:android:bf84789996fe2002ae446c',
    messagingSenderId: '851412613125',
    projectId: 'okul-otomat-projesi',
    storageBucket: 'okul-otomat-projesi.firebasestorage.app',
  );
}
