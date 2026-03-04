import 'package:flutter/material.dart';

class Urun {
  String? id;
  String isim;
  double fiyat;
  String resimYolu;
  String kategori;
  int stok;

  Urun({
    this.id,
    required this.isim,
    required this.fiyat,
    required this.resimYolu,
    required this.kategori,
    this.stok = 0,
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
