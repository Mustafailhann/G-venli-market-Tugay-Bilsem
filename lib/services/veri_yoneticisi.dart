import 'dart:async';
import 'dart:convert';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/ogrenci.dart';

class VeriYoneticisi {
  static final VeriYoneticisi _instance = VeriYoneticisi._internal();
  factory VeriYoneticisi() => _instance;
  VeriYoneticisi._internal();

  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  // ÖZEL ADMIN KARTI
  final String adminCikisKarti = '3539442829';

  // Öğrenci verileri
  final Map<String, Ogrenci> ogrenciler = {};

  // Admin şifresi
  final String adminSifresi = '1234';

  // Ürün satış takibi
  final Map<String, int> urunSatislari = {};
  
  // OFFLINE DEPOLAMA
  SharedPreferences? _prefs;
  List<Map<String, dynamic>> _offlineIslemler = [];
  bool _internetVarMi = true;
  Timer? _senkronizasyonTimer;

  // Firestore'dan verileri yükle
  Future<void> verileriYukle() async {
    _prefs = await SharedPreferences.getInstance();
    await _offlineIslemleriYukle();
    await _offlineVerileriYukle();
    
    try {
      await Future.wait([
        _ogrencileriYukle(),
        _urunSatislariniYukle(),
      ]);
      _internetVarMi = true;
      print('✅ Firebase verileri yüklendi - Kart okuyucu hazır!');
      
      await _offlineIslemleriSenkronizeEt();
      
      _senkronizasyonTimer?.cancel();
      _senkronizasyonTimer = Timer.periodic(Duration(seconds: 30), (_) {
        _offlineIslemleriSenkronizeEt();
      });
    } catch (e) {
      _internetVarMi = false;
      print('⚠️ Firebase bağlanamadı - OFFLINE MODDA çalışıyor (${ogrenciler.length} öğrenci hazır)');
    }
  }

  Future<void> _ogrencileriYukle() async {
    try {
      final snapshot = await _firestore.collection('ogrenciler').get();
      
      for (var doc in snapshot.docs) {
        final data = doc.data();
        final islemler = (data['islemGecmisi'] as List?)?.map((islem) {
          return Islem(
            tarih: (islem['tarih'] as Timestamp).toDate(),
            tip: islem['tip'],
            tutar: (islem['tutar'] as num).toDouble(),
            aciklama: islem['aciklama'],
            urunler: (islem['urunler'] as List?)?.cast<String>(),
          );
        }).toList() ?? [];

        ogrenciler[doc.id] = Ogrenci(
          kartID: doc.id,
          adSoyad: data['adSoyad'],
          sinif: data['sinif'],
          bakiye: (data['bakiye'] as num).toDouble(),
          islemGecmisi: islemler,
        );
      }
      print('✅ ${snapshot.docs.length} öğrenci Firestore\'dan yüklendi (Toplam: ${ogrenciler.length})');
    } catch (e) {
      print('❌ Öğrenciler yüklenirken hata: $e');
    }
  }

  Future<void> _urunSatislariniYukle() async {
    try {
      final doc = await _firestore.collection('istatistikler').doc('urunSatislari').get();
      if (doc.exists) {
        final data = doc.data() as Map<String, dynamic>;
        data.forEach((key, value) {
          urunSatislari[key] = value as int;
        });
        print('✅ Ürün satışları Firestore\'dan yüklendi');
      }
    } catch (e) {
      print('❌ Ürün satışları yüklenirken hata: $e');
    }
  }

  Ogrenci? ogrenciBul(String kartID) {
    return ogrenciler[kartID];
  }

  Future<void> bakiyeYukle(String kartID, double miktar) async {
    if (ogrenciler.containsKey(kartID)) {
      ogrenciler[kartID]!.bakiye += miktar;
      final yeniIslem = Islem(
        tarih: DateTime.now(),
        tip: 'Bakiye Yükleme',
        tutar: miktar,
        aciklama: 'Admin tarafından yüklendi',
      );
      ogrenciler[kartID]!.islemGecmisi.add(yeniIslem);
      
      await _ogrencileriOfflineKaydet();

      try {
        await _firestore.collection('ogrenciler').doc(kartID).update({
          'bakiye': ogrenciler[kartID]!.bakiye,
          'islemGecmisi': FieldValue.arrayUnion([{
            'tarih': Timestamp.fromDate(yeniIslem.tarih),
            'tip': yeniIslem.tip,
            'tutar': yeniIslem.tutar,
            'aciklama': yeniIslem.aciklama,
          }]),
        }).timeout(Duration(seconds: 2));
        print('✅ Bakiye Firestore\'a kaydedildi: $kartID - $miktar TL');
      } catch (e) {
        print('⚠️ İnternet yok - Offline kaydedildi: $e');
        await _offlineIslemEkle({
          'tip': 'bakiye_yukleme',
          'kartID': kartID,
          'tutar': miktar,
          'yeniBakiye': ogrenciler[kartID]!.bakiye,
          'tarih': yeniIslem.tarih.toIso8601String(),
          'aciklama': yeniIslem.aciklama,
        });
      }
    }
  }

  Future<void> odemeYap(String kartID, double tutar, String aciklama, {List<String>? urunler}) async {
    if (ogrenciler.containsKey(kartID)) {
      ogrenciler[kartID]!.bakiye -= tutar;
      final yeniIslem = Islem(
        tarih: DateTime.now(),
        tip: 'Ödeme',
        tutar: -tutar,
        aciklama: aciklama,
        urunler: urunler,
      );
      ogrenciler[kartID]!.islemGecmisi.add(yeniIslem);
      
      if (urunler != null) {
        for (var urun in urunler) {
          String urunIsmi = urun.split(' (x')[0];
          urunSatislari[urunIsmi] = (urunSatislari[urunIsmi] ?? 0) + 1;
        }
      }
      
      await _ogrencileriOfflineKaydet();

      try {
        // Timeout ile Firebase'e kaydet (offline modda hızlı fail olsun)
        await _firestore.collection('ogrenciler').doc(kartID).update({
          'bakiye': ogrenciler[kartID]!.bakiye,
          'islemGecmisi': FieldValue.arrayUnion([{
            'tarih': Timestamp.fromDate(yeniIslem.tarih),
            'tip': yeniIslem.tip,
            'tutar': yeniIslem.tutar,
            'aciklama': yeniIslem.aciklama,
            'urunler': yeniIslem.urunler,
          }]),
        }).timeout(Duration(seconds: 2));

        if (urunler != null) {
          await _firestore.collection('istatistikler').doc('urunSatislari').set(
            urunSatislari,
            SetOptions(merge: true),
          ).timeout(Duration(seconds: 2));
        }
        print('✅ Ödeme Firestore\'a kaydedildi: $kartID - $tutar TL');
      } catch (e) {
        print('⚠️ İnternet yok - Offline kaydedildi: $e');
        await _offlineIslemEkle({
          'tip': 'odeme',
          'kartID': kartID,
          'tutar': -tutar,
          'yeniBakiye': ogrenciler[kartID]!.bakiye,
          'tarih': yeniIslem.tarih.toIso8601String(),
          'aciklama': aciklama,
          'urunler': urunler,
        });
      }
    }
  }

  Future<void> yeniOgrenciEkle(Ogrenci ogrenci) async {
    ogrenciler[ogrenci.kartID] = ogrenci;
    
    try {
      await _firestore.collection('ogrenciler').doc(ogrenci.kartID).set({
        'adSoyad': ogrenci.adSoyad,
        'sinif': ogrenci.sinif,
        'bakiye': ogrenci.bakiye,
        'islemGecmisi': [],
      });
      print('✅ Yeni öğrenci Firestore\'a eklendi: ${ogrenci.adSoyad}');
    } catch (e) {
      print('❌ Öğrenci ekleme hatası: $e');
    }
  }
  
  // ===== OFFLINE FONKSİYONLARI =====
  
  Future<void> _offlineIslemleriYukle() async {
    try {
      final String? jsonData = _prefs?.getString('offline_islemler');
      if (jsonData != null) {
        final List<dynamic> decoded = jsonDecode(jsonData);
        _offlineIslemler = decoded.cast<Map<String, dynamic>>();
        print('📥 ${_offlineIslemler.length} offline işlem yüklendi');
      }
    } catch (e) {
      print('❌ Offline işlemler yüklenirken hata: $e');
      _offlineIslemler = [];
    }
  }
  
  Future<void> _offlineIslemleriKaydet() async {
    try {
      final String jsonData = jsonEncode(_offlineIslemler);
      await _prefs?.setString('offline_islemler', jsonData);
    } catch (e) {
      print('❌ Offline işlemler kaydedilirken hata: $e');
    }
  }
  
  Future<void> _ogrencileriOfflineKaydet() async {
    try {
      final Map<String, dynamic> data = {};
      ogrenciler.forEach((key, ogrenci) {
        data[key] = {
          'kartID': ogrenci.kartID,
          'adSoyad': ogrenci.adSoyad,
          'sinif': ogrenci.sinif,
          'bakiye': ogrenci.bakiye,
          'islemGecmisi': ogrenci.islemGecmisi.map((islem) => {
            'tarih': islem.tarih.toIso8601String(),
            'tip': islem.tip,
            'tutar': islem.tutar,
            'aciklama': islem.aciklama,
            'urunler': islem.urunler,
          }).toList(),
        };
      });
      final String jsonData = jsonEncode(data);
      await _prefs?.setString('offline_ogrenciler', jsonData);
      print('💾 Öğrenci verileri offline kaydedildi');
    } catch (e) {
      print('❌ Offline kayıt hatası: $e');
    }
  }
  
  Future<void> _offlineVerileriYukle() async {
    try {
      final String? jsonData = _prefs?.getString('offline_ogrenciler');
      if (jsonData != null) {
        final Map<String, dynamic> data = jsonDecode(jsonData);
        ogrenciler.clear();
        data.forEach((key, value) {
          final islemler = (value['islemGecmisi'] as List).map((islem) {
            return Islem(
              tarih: DateTime.parse(islem['tarih']),
              tip: islem['tip'],
              tutar: islem['tutar'],
              aciklama: islem['aciklama'],
              urunler: (islem['urunler'] as List?)?.cast<String>(),
            );
          }).toList();
          
          ogrenciler[key] = Ogrenci(
            kartID: value['kartID'],
            adSoyad: value['adSoyad'],
            sinif: value['sinif'],
            bakiye: value['bakiye'],
            islemGecmisi: islemler,
          );
        });
        print('📱 ${ogrenciler.length} öğrenci OFFLINE verilerden yüklendi');
      }
    } catch (e) {
      print('❌ Offline veriler yüklenirken hata: $e');
    }
  }
  
  Future<void> _offlineIslemEkle(Map<String, dynamic> islem) async {
    _offlineIslemler.add(islem);
    await _offlineIslemleriKaydet();
    print('💾 Offline işlem kaydedildi (Toplam: ${_offlineIslemler.length})');
  }
  
  Future<void> _offlineIslemleriSenkronizeEt() async {
    if (_offlineIslemler.isEmpty) return;
    
    print('🔄 ${_offlineIslemler.length} offline işlem senkronize ediliyor...');
    
    final List<Map<String, dynamic>> basariliIslemler = [];
    
    for (var islem in _offlineIslemler) {
      try {
        if (islem['tip'] == 'odeme') {
          await _firestore.collection('ogrenciler').doc(islem['kartID']).update({
            'bakiye': islem['yeniBakiye'],
            'islemGecmisi': FieldValue.arrayUnion([{
              'tarih': Timestamp.fromDate(DateTime.parse(islem['tarih'])),
              'tip': 'Ödeme',
              'tutar': islem['tutar'],
              'aciklama': islem['aciklama'],
              'urunler': islem['urunler'],
            }]),
          });
          
          if (islem['urunler'] != null) {
            for (var urun in (islem['urunler'] as List)) {
              String urunIsmi = urun.split(' (x')[0];
              urunSatislari[urunIsmi] = (urunSatislari[urunIsmi] ?? 0) + 1;
            }
            await _firestore.collection('istatistikler').doc('urunSatislari').set(
              urunSatislari,
              SetOptions(merge: true),
            );
          }
          
        } else if (islem['tip'] == 'bakiye_yukleme') {
          await _firestore.collection('ogrenciler').doc(islem['kartID']).update({
            'bakiye': islem['yeniBakiye'],
            'islemGecmisi': FieldValue.arrayUnion([{
              'tarih': Timestamp.fromDate(DateTime.parse(islem['tarih'])),
              'tip': 'Bakiye Yükleme',
              'tutar': islem['tutar'],
              'aciklama': islem['aciklama'],
            }]),
          });
        }
        
        basariliIslemler.add(islem);
        print('✅ Offline işlem senkronize edildi: ${islem['tip']}');
      } catch (e) {
        print('❌ İşlem senkronize edilemedi: $e');
      }
    }
    
    for (var islem in basariliIslemler) {
      _offlineIslemler.remove(islem);
    }
    
    await _offlineIslemleriKaydet();
    print('✅ Senkronizasyon tamamlandı (Kalan: ${_offlineIslemler.length})');
  }
}
