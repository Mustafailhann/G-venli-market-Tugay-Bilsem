import 'package:flutter/material.dart';

class Urun {
  String isim;
  double fiyat;
  String resimYolu;
  String kategori;

  Urun({
    required this.isim,
    required this.fiyat,
    required this.resimYolu,
    required this.kategori,
  });
}

class SepetItem {
  Urun urun;
  int miktar;

  SepetItem({required this.urun, this.miktar = 1});
}

class Kategori {
  String isim;
  IconData icon;
  Color renk;
  String? resimYolu;

  Kategori({
    required this.isim,
    required this.icon,
    required this.renk,
    this.resimYolu,
  });
}
