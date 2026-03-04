import 'dart:async';
import 'dart:convert';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter/foundation.dart';
import '../models/ogrenci.dart';
import '../models/urun.dart';

class VeriYoneticisi extends ChangeNotifier {
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
  
  // Ürün Listesi (Firestore'dan gelecek)
  List<Urun> urunler = [];

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
        _urunleriYukle(), // Yeni ürün yükleme fonksiyonu
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

  // Stream Subscriptions
  StreamSubscription? _ogrenciSubscription;
  StreamSubscription? _urunSubscription;

  Future<void> _ogrencileriYukle() async {
    final completer = Completer<void>();

    try {
      // Önceki dinlemeyi iptal et
      await _ogrenciSubscription?.cancel();
      
      // Real-time listener başlat
      _ogrenciSubscription = _firestore.collection('ogrenciler').snapshots().listen(
        (snapshot) {
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
          print('✅ ${snapshot.docs.length} öğrenci güncellendi (Stream)');
          notifyListeners();
          
          // İlk veri geldiğinde future'ı tamamla
          if (!completer.isCompleted) completer.complete();
        },
        onError: (e) {
          print('❌ Öğrenci stream hatası: $e');
          if (!completer.isCompleted) completer.completeError(e);
        },
      );

      // İlk veriyi bekle (maksimum 5 saniye)
      await completer.future.timeout(Duration(seconds: 5), onTimeout: () {
        print('⚠️ İlk veri yükleme zaman aşımı, ancak dinleme devam ediyor.');
      });
      
    } catch (e) {
      print('⚠️ Yeni öğrenci eklenirken hata (Offline): $e');
    }
    notifyListeners();
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

  Future<void> _urunleriYukle() async {
    final completer = Completer<void>();

    try {
      // Önceki dinlemeyi iptal et
      await _urunSubscription?.cancel();

      // Real-time listener başlat
      _urunSubscription = _firestore.collection('urunler').snapshots().listen(
        (snapshot) {
          urunler.clear(); // Listeyi temizle ve yeniden oluştur
          
          for (var doc in snapshot.docs) {
            final data = doc.data();
            urunler.add(Urun(
              id: doc.id,
              isim: data['ad'] ?? 'İsimsiz Ürün',
              fiyat: (data['fiyat'] as num?)?.toDouble() ?? 0.0,
              resimYolu: data['resimURL'] ?? '',
              kategori: data['kategori'] ?? 'Diğer',
              stok: (data['stok'] as int?) ?? 0,
            ));
          }

          print('✅ ${urunler.length} ürün güncellendi (Stream)');
          notifyListeners();
          
          if (!completer.isCompleted) completer.complete();
        },
        onError: (e) {
          print('❌ Ürün stream hatası: $e');
          if (!completer.isCompleted) completer.completeError(e);
        },
      );

      // İlk veriyi bekle
      await completer.future.timeout(Duration(seconds: 5), onTimeout: () {
        print('⚠️ Ürün verisi yükleme zaman aşımı.');
      });

    } catch (e) {
      print('❌ Ürünler yüklenirken hata: $e');
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
      notifyListeners();
    }
  }

  Future<bool> odemeYap(String kartID, double tutar, List<SepetItem> sepet) async {
    try {
      final docRef = _firestore.collection('ogrenciler').doc(kartID);
      
      // Satılan ürünlerin isimleri ve stok güncellemeleri
      WriteBatch batch = _firestore.batch();
      
      print('💳 Ödeme Yapılıyor: Kart: $kartID, Tutar: $tutar');
      
      // Bakiye düşme işlemi
      final islem = {
        'tarih': Timestamp.now(),
        'tip': 'Harcama',
        'tutar': -tutar, // Negatif tutar (Harcama)
        'aciklama': 'Kantin Alışverişi',
        'urunler': sepet.map((item) => "${item.urun.isim} (x${item.miktar})").toList()
      };

      batch.update(docRef, {
        'bakiye': FieldValue.increment(-tutar),
        'islemGecmisi': FieldValue.arrayUnion([islem])
      });

      // İstatistik ve Stok Güncelleme - Batch işlemine ekle
      final istatistikRef = _firestore.collection('istatistikler').doc('urunSatislari');
      Map<String, dynamic> istatistikUpdate = {};

      for (var item in sepet) {
        // İstatistik güncellemesi
        istatistikUpdate[item.urun.isim] = FieldValue.increment(item.miktar);
        
        // Stok düşme işlemi
        try {
            String? urunId = item.urun.id;
            
            // ID yoksa isimden bul
            if (urunId == null) {
                final stokUrun = urunler.firstWhere(
                    (u) => u.isim == item.urun.isim, 
                    orElse: () => Urun(isim: '', fiyat: 0, resimYolu: '', kategori: '', stok: 0)
                );
                urunId = stokUrun.id;
            }

            if (urunId != null && urunId.isNotEmpty) {
                final urunRef = _firestore.collection('urunler').doc(urunId);
                batch.update(urunRef, {
                    'stok': FieldValue.increment(-item.miktar)
                });
            } else {
                print('⚠️ Stok düşülecek ürün ID bulunamadı: ${item.urun.isim}');
            }
        } catch (e) {
            print('⚠️ Stok düşme hatası (${item.urun.isim}): $e');
        }
      }

      if (istatistikUpdate.isNotEmpty) {
        batch.set(istatistikRef, istatistikUpdate, SetOptions(merge: true));
      }

      // Tüm işlemleri tek seferde uygula
      await batch.commit();

      // Yerel istatistikleri güncelle
       for (var item in sepet) {
        urunSatislari[item.urun.isim] = (urunSatislari[item.urun.isim] ?? 0) + item.miktar;
      }
      
      
      notifyListeners(); // İstatistikler güncellendiği için
      return true;
    } catch (e) {
      print('❌ Ödeme hatası: $e');
      return false;
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
    notifyListeners();
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
              'tip': 'Harcama',
              'tutar': islem['tutar'] is double && (islem['tutar'] as double) > 0 
                  ? -(islem['tutar'] as double) 
                  : islem['tutar'], // Yüklerken zaten negatif değilse negatif yap
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
