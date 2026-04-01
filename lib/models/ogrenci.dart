class Ogrenci {
  String kartID;   // Karttan okunan ID (veya doc.id)
  String docID;   // Firestore döküman ID'si (her zaman doc.id)
  String adSoyad;
  String sinif;
  double bakiye;
  List<Islem> islemGecmisi;

  Ogrenci({
    required this.kartID,
    String? docID,
    required this.adSoyad,
    required this.sinif,
    this.bakiye = 0.0,
    List<Islem>? islemGecmisi,
  }) : docID = docID ?? kartID,
       islemGecmisi = islemGecmisi ?? [];
}

class Islem {
  DateTime tarih;
  String tip; // 'Bakiye Yükleme', 'Ödeme'
  double tutar;
  String aciklama;
  List<String>? urunler; // Satın alınan ürünler

  Islem({
    required this.tarih,
    required this.tip,
    required this.tutar,
    required this.aciklama,
    this.urunler,
  });
}
