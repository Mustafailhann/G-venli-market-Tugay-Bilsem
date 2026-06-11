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
                toplamMaliyet: islem['toplamMaliyet'] != null
                    ? (islem['toplamMaliyet'] as num).toDouble()
                    : null,
                 urunler: (islem['urunler'] as List?)?.map((u) {
                  // Legacy support: old records stored plain strings like 'Eti Canga (x2)'
                  if (u is String) return u;
                  // New format: structured Map objects
                  return UrunKalemi.fromMap(Map<String, dynamic>.from(u as Map));
                }).toList(),
                islemFotografi: islem['islemFotografi'],
              );
            }).toList() ?? [];

            final ogrenci = Ogrenci(
              kartID: doc.id,
              adSoyad: data['adSoyad'],
              sinif: data['sinif'],
              bakiye: (data['bakiye'] as num).toDouble(),
              islemGecmisi: islemler,
              tip: data['tip'],
            );

            // Döküman ID'siyle kaydet (her zaman)
            ogrenciler[doc.id] = ogrenci;

            // Eğer ayrıca bir kartID alanı varsa ve doc.id'den farklıysa,
            // onu da ekle — admin panelinden girilen kart numarasıyla eşleşsin
            final kartIDAlani = data['kartID']?.toString();
            if (kartIDAlani != null && kartIDAlani.isNotEmpty && kartIDAlani != doc.id) {
              ogrenciler[kartIDAlani] = ogrenci;
              print('🔗 Kart eşleşmesi: $kartIDAlani → ${ogrenci.adSoyad}');
            }
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
              maliyet: (data['maliyet'] as num?)?.toDouble() ?? 0.0,
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


      // Firestore güncellemesi için her zaman docID kullan
      final docID = ogrenciler[kartID]!.docID;

      try {
        await _firestore.collection('ogrenciler').doc(docID).update({
          'bakiye': ogrenciler[kartID]!.bakiye,
          'islemGecmisi': FieldValue.arrayUnion([{
            'tarih': Timestamp.fromDate(yeniIslem.tarih),
            'tip': yeniIslem.tip,
            'tutar': yeniIslem.tutar,
            'aciklama': yeniIslem.aciklama,
          }]),
        }).timeout(Duration(seconds: 2));
        print('✅ Bakiye Firestore\'a kaydedildi: $docID - $miktar TL');
      } catch (e) {
        print('⚠️ İnternet yok - Offline kaydedildi: $e');
        await _offlineIslemEkle({
          'tip': 'bakiye_yukleme',
          'kartID': docID,
          'tutar': miktar,
          'yeniBakiye': ogrenciler[kartID]!.bakiye,
          'tarih': yeniIslem.tarih.toIso8601String(),
          'aciklama': yeniIslem.aciklama,
        });
      }
      notifyListeners();
    }
  }


  Future<bool> odemeYap(String kartID, double tutar, List<SepetItem> sepet, {String? islemFotografiYolu}) async {
    try {
      // Firestore güncellemesi için her zaman docID kullan
      final docID = ogrenciler[kartID]?.docID ?? kartID;
      final docRef = _firestore.collection('ogrenciler').doc(docID);

      print('💳 Ödeme Başlatıldı: Kart=$kartID, Tutar=$tutar');

      // ── 1. Kesin Maliyet Hesabı (çift hassasiyet hatasını önlemek için yuvarla) ──
      double toplamMaliyet = 0.0;
      for (var item in sepet) {
        // item.miktar int'e cast edilir, maliyet double × int = kesin çarpım
        toplamMaliyet += item.urun.maliyet * item.miktar.toInt();
      }
      // 2 ondalık basamağa yuvarla — floating point birikimi önlenir
      toplamMaliyet = double.parse(toplamMaliyet.toStringAsFixed(2));
      final double toplamTutar = double.parse(tutar.toStringAsFixed(2));

      // ── 2. Açıklama metni ──
      final aciklama = sepet
          .map((item) => '${item.urun.isim} (x${item.miktar.toInt()})')
          .join(', ');

      // ── 3. Web Panel için kesinleştirilmiş yapısal ürün listesi ──
      // Alan adları (id, ad, miktar, birimFiyat, toplamTutar) web panel beklentisiyle örtüşmeli.
      // miktar: int — Firestore'a double değil kesinlikle int gönderilmeli.
      final List<Map<String, dynamic>> urunlerYapili = sepet.map((item) {
        final int adet = item.miktar.toInt(); // ✅ Kesin int cast
        final double birimFiyat = double.parse(item.urun.fiyat.toStringAsFixed(2));
        final double satirToplam = double.parse((birimFiyat * adet).toStringAsFixed(2));
        print('📊 Kalem: ${item.urun.isim} | Adet=$adet | Birim=${birimFiyat}TL | Satır=${satirToplam}TL');
        return <String, dynamic>{
          'id'         : item.urun.id ?? '',
          'ad'         : item.urun.isim,
          'miktar'     : adet,        // ✅ int — Firestore'da Number(int)
          'birimFiyat' : birimFiyat,  // ✅ 2dp double
          'toplamTutar': satirToplam, // ✅ 2dp double
        };
      }).toList();

      final islem = <String, dynamic>{
        'tarih'       : Timestamp.now(),
        'tip'         : 'Harcama',
        'tutar'       : toplamTutar,    // ✅ 2dp — kesin tutar
        'aciklama'    : aciklama,
        'toplamMaliyet': toplamMaliyet,  // ✅ 2dp immutable maliyet snapshot
        'urunler'     : urunlerYapili,  // ✅ Structured, strictly typed
        'isCancelled' : false,
        if (islemFotografiYolu != null) 'islemFotografi': islemFotografiYolu,
      };

      await _firestore.runTransaction((transaction) async {
        // 1. Stok okuma
        Map<String, DocumentReference> urunRefs = {};
        Map<String, DocumentSnapshot> urunSnaps = {};

        for (var item in sepet) {
          String? urunId = item.urun.id;
          if (urunId == null) {
            final stokUrun = urunler.firstWhere(
              (u) => u.isim == item.urun.isim,
              orElse: () => Urun(isim: '', fiyat: 0, resimYolu: '', kategori: '', stok: 0),
            );
            urunId = stokUrun.id;
          }
          if (urunId != null && urunId.isNotEmpty) {
            final urunRef = _firestore.collection('urunler').doc(urunId);
            urunRefs[item.urun.isim] = urunRef;
            urunSnaps[item.urun.isim] = await transaction.get(urunRef);
          }
        }

        // 2. Stok yeterliliği doğrulama
        for (var item in sepet) {
          final snap = urunSnaps[item.urun.isim];
          if (snap != null && snap.exists) {
            final veriler = snap.data() as Map<String, dynamic>?;
            final int currentStock = (veriler?['stok'] as num?)?.toInt() ?? 0;
            final int istenenAdet = item.miktar.toInt();
            if (currentStock < istenenAdet) {
              throw Exception('Yetersiz Stok: ${item.urun.isim} (Mevcut: $currentStock, İstenen: $istenenAdet)');
            }
          }
        }

        // 3. Bakıye ve işlem geçmişi güncelle
        // ✅ FieldValue.increment: SET değil — race condition güvenli
        transaction.update(docRef, {
          'bakiye'      : FieldValue.increment(-toplamTutar),
          'islemGecmisi': FieldValue.arrayUnion([islem]),
        });

        // 4. Stok düşüş + istatistik
        final istatistikRef = _firestore.collection('istatistikler').doc('urunSatislari');
        final Map<String, dynamic> istatistikUpdate = {};

        for (var item in sepet) {
          final int adet = item.miktar.toInt();
          // İstatistik: satış adedini biriktir
          istatistikUpdate[item.urun.isim] = FieldValue.increment(adet);
          // Stok: tam adet kadar düş — hiçbir zaman 1 değil, her zaman adet
          if (urunRefs.containsKey(item.urun.isim)) {
            transaction.update(urunRefs[item.urun.isim]!, {
              'stok': FieldValue.increment(-adet), // ✅ Kesin adet, int
            });
            print('📦 Stok düşülüyor: ${item.urun.isim} → -$adet');
          } else {
            print('⚠️ Stok düşülecek ürün bulunamadı: ${item.urun.isim}');
          }
        }

        if (istatistikUpdate.isNotEmpty) {
          transaction.set(istatistikRef, istatistikUpdate, SetOptions(merge: true));
        }
      });

      // ✅ Transaction onaylanınca yerel cache güncelenir
      if (ogrenciler.containsKey(kartID)) {
        ogrenciler[kartID]!.bakiye -= toplamTutar;
        ogrenciler[kartID]!.islemGecmisi.add(Islem(
          tarih: DateTime.now(),
          tip: 'Harcama',
          tutar: toplamTutar,
          aciklama: aciklama,
          toplamMaliyet: toplamMaliyet,
          urunler: [],
        ));
      }

      for (var item in sepet) {
        urunSatislari[item.urun.isim] = (urunSatislari[item.urun.isim] ?? 0) + item.miktar.toInt();
      }

      notifyListeners();
      print('✅ Ödeme Firebase\'a kaydedildi: $docID | Tutar=$toplamTutar TL | Maliyet=$toplamMaliyet TL');
      return true;

    } catch (e) {
      print('❌ Ödeme hatası: $e');
      if (e.toString().contains('Yetersiz Stok')) rethrow;

      // ❌ Firebase başarısız — offline kuyruğuna ekle
      final docID = ogrenciler[kartID]?.docID ?? kartID;
      final aciklama = sepet.map((item) => '${item.urun.isim} (x${item.miktar.toInt()})').join(', ');
      double toplamMaliyet = 0.0;
      for (var item in sepet) toplamMaliyet += item.urun.maliyet * item.miktar.toInt();
      toplamMaliyet = double.parse(toplamMaliyet.toStringAsFixed(2));

      final List<Map<String, dynamic>> urunlerYapili = sepet.map((item) {
        final int adet = item.miktar.toInt();
        final double birimFiyat = double.parse(item.urun.fiyat.toStringAsFixed(2));
        return <String, dynamic>{
          'id'         : item.urun.id ?? '',
          'ad'         : item.urun.isim,
          'miktar'     : adet,
          'birimFiyat' : birimFiyat,
          'toplamTutar': double.parse((birimFiyat * adet).toStringAsFixed(2)),
        };
      }).toList();

      await _offlineIslemEkle({
        'tip'          : 'odeme',
        'kartID'       : docID,
        'tutar'        : double.parse(tutar.toStringAsFixed(2)),
        'tarih'        : DateTime.now().toIso8601String(),
        'aciklama'     : aciklama,
        'toplamMaliyet': toplamMaliyet,
        'urunler'      : urunlerYapili,
        if (islemFotografiYolu != null) 'islemFotografi': islemFotografiYolu,
      });
      print('💾 Offline kuyruğuna eklendi (internet gelince senkronize edilecek).');
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
          'tip': ogrenci.tip,
          'islemGecmisi': ogrenci.islemGecmisi.map((islem) => {
            'tarih': islem.tarih.toIso8601String(),
            'tip': islem.tip,
            'tutar': islem.tutar,
            'aciklama': islem.aciklama,
            if (islem.toplamMaliyet != null) 'toplamMaliyet': islem.toplamMaliyet,
            'urunler': islem.urunler,
            'islemFotografi': islem.islemFotografi,
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
              toplamMaliyet: islem['toplamMaliyet'] != null
                  ? (islem['toplamMaliyet'] as num).toDouble()
                  : null,
              urunler: (islem['urunler'] as List?)?.map((u) {
                if (u is String) return u;
                return UrunKalemi.fromMap(Map<String, dynamic>.from(u as Map));
              }).toList(),
              islemFotografi: islem['islemFotografi'],
            );
          }).toList();
          
          ogrenciler[key] = Ogrenci(
            kartID: value['kartID'],
            adSoyad: value['adSoyad'],
            sinif: value['sinif'],
            bakiye: value['bakiye'],
            islemGecmisi: islemler,
            tip: value['tip'],
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
            // ✅ FieldValue.increment kullan — 'set' değil (race condition tehlikesi)
            'bakiye': FieldValue.increment(-(islem['tutar'] as num).toDouble()),
            'islemGecmisi': FieldValue.arrayUnion([{
              'tarih': Timestamp.fromDate(DateTime.parse(islem['tarih'])),
              'tip': 'Harcama',
              'tutar': islem['tutar'],
              'aciklama': islem['aciklama'],
              'toplamMaliyet': islem['toplamMaliyet'] ?? 0.0, // preserve cost snapshot
              'urunler': islem['urunler'] ?? [],
              if (islem['islemFotografi'] != null) 'islemFotografi': islem['islemFotografi']
            }]),
          });
          
          // Stok düşülmesi ve istatistik güncellemesi
          if (islem['urunler'] != null) {
            for (var urun in (islem['urunler'] as List)) {
              String urunIsmi;
              int qty = 1;
              if (urun is Map) {
                // New structured format
                urunIsmi = urun['ad'] ?? '';
                qty = (urun['miktar'] as num?)?.toInt() ?? 1;
              } else {
                // Legacy string format: 'ProductName (x2)'
                final str = urun.toString();
                final match = RegExp(r'^(.*?) \(x(\d+)\)$').firstMatch(str);
                urunIsmi = match != null ? match.group(1)!.trim() : str.split(' (x')[0];
                qty = match != null ? int.tryParse(match.group(2)!) ?? 1 : 1;
              }
              urunSatislari[urunIsmi] = (urunSatislari[urunIsmi] ?? 0) + qty;
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
