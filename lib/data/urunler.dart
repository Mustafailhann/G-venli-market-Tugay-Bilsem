import 'package:flutter/material.dart';
import '../models/urun.dart';

final List<Kategori> kategoriler = [
  Kategori(isim: 'İçecekler', icon: Icons.local_drink, renk: Colors.blue, resimYolu: 'assets/images/beypazarı.png'),
  Kategori(isim: 'Atıştırmalıklar', icon: Icons.cookie, renk: Colors.orange, resimYolu: 'assets/images/ruffles.jpg'),
  Kategori(isim: 'Tatlılar', icon: Icons.cake, renk: Colors.red, resimYolu: 'assets/images/tutku.jpg'),
  Kategori(isim: 'Gofretter', icon: Icons.fastfood, renk: Colors.brown, resimYolu: 'assets/images/gofret.png'),
];

final List<Urun> urunler = [
  // İçecekler
  Urun(isim: 'Su', fiyat: 5.0, resimYolu: 'assets/images/su.png', kategori: 'İçecekler'),
  Urun(isim: 'Beypazarı', fiyat: 7.0, resimYolu: 'assets/images/beypazarı.png', kategori: 'İçecekler'),
  Urun(isim: 'Limonlu Soda', fiyat: 8.0, resimYolu: 'assets/images/limonlu soda.png', kategori: 'İçecekler'),
  Urun(isim: 'Zen Ananas', fiyat: 12.0, resimYolu: 'assets/images/zen ananas.jpg', kategori: 'İçecekler'),
  Urun(isim: 'Didi Karpuz-Çilek', fiyat: 10.0, resimYolu: 'assets/images/didi karpuz - çilek.png', kategori: 'İçecekler'),
  Urun(isim: 'Kurbağa Yumurta İçecek', fiyat: 15.0, resimYolu: 'assets/images/kurbaga yumurtalı ıcecek.jpg', kategori: 'İçecekler'),
  
  // Atıştırmalıklar
  Urun(isim: 'Ruffles', fiyat: 12.0, resimYolu: 'assets/images/ruffles.jpg', kategori: 'Atıştırmalıklar'),
  Urun(isim: 'Ruffles Ayak Kokulu', fiyat: 13.0, resimYolu: 'assets/images/ayak kokulu ruffles.webp', kategori: 'Atıştırmalıklar'),
  Urun(isim: 'Çizi Cips', fiyat: 10.0, resimYolu: 'assets/images/çizi cips.png', kategori: 'Atıştırmalıklar'),
  Urun(isim: 'Haribo Mix', fiyat: 11.0, resimYolu: 'assets/images/harıbi mix.webp', kategori: 'Atıştırmalıklar'),
  Urun(isim: 'Kolalı Jibiton', fiyat: 9.0, resimYolu: 'assets/images/kolalı jıbılon.png', kategori: 'Atıştırmalıklar'),
  
  // Tatlılar
  Urun(isim: 'Tutku', fiyat: 15.0, resimYolu: 'assets/images/tutku.jpg', kategori: 'Tatlılar'),
  Urun(isim: 'Nero', fiyat: 14.0, resimYolu: 'assets/images/nerrrrrrro.png', kategori: 'Tatlılar'),
  Urun(isim: 'Biskrem', fiyat: 12.0, resimYolu: 'assets/images/biskrem.png', kategori: 'Tatlılar'),
  Urun(isim: 'Avşar', fiyat: 13.0, resimYolu: 'assets/images/avşar.jpg', kategori: 'Tatlılar'),
  Urun(isim: 'Frambuazlı Sufle', fiyat: 16.0, resimYolu: 'assets/images/fram sufle.jpg', kategori: 'Tatlılar'),
  Urun(isim: 'Normal Sufle', fiyat: 14.0, resimYolu: 'assets/images/norml suffl.jpg', kategori: 'Tatlılar'),
  
  // Gofretter
  Urun(isim: 'Gofret', fiyat: 10.0, resimYolu: 'assets/images/gofret.png', kategori: 'Gofretter'),
];
