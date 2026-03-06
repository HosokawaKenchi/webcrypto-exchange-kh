# PWA アイコン生成ガイド

このドキュメントでは、WebCrypto Exchange PWA用のアイコンをPNG形式で生成する方法について説明します。

## 概要

PWA (Progressive Web App) では、複数サイズのアイコンが必要です。このプロジェクトでは以下のアイコンが使用されます：

- `icon.svg` - SVGベクターアイコン（スケーラブル）
- `icon-192.png` - 192×192 ピクセル
- `icon-512.png` - 512×512 ピクセル

## アイコン生成方法

### 方法1：HTMLベースの生成ツール（推奨）

最も簡単な方法です。ブラウザのみで完結します：

1. `generate-icons.html` をブラウザで開く
2. 「192×192 を生成」または「512×512 を生成」ボタンをクリック
3. PNG画像が自動的にダウンロードされます

**利点：**
- 追加のソフトウェア不要
- ワンクリックで完了

### 方法2：Node.js を使用した生成

Node.jsとsharpパッケージを使用する方法：

```bash
# sharpパッケージをインストール（初回のみ）
npm install sharp

# アイコンを生成
node generate-icons.js
```

**利点：**
- バッチ処理で複数サイズを一度に生成
- スクリプト化可能

### 方法3：ImageMagick を使用した生成

ImageMagickコマンドラインツールを使用：

```bash
# 192×192 を生成
magick convert -background none -density 300 -resize 192x192 icon.svg icon-192.png

# 512×512 を生成
magick convert -background none -density 300 -resize 512x512 icon.svg icon-512.png
```

**利点：**
- 高品質な変換
- 柔軟な設定が可能

### 方法4：Python スクリプト を使用した生成

Pythonライブラリを使用：

```bash
# 必要なパッケージをインストール（初回のみ）
pip install pillow cairosvg

# スクリプトを実行
python generate_icons.py
```

## 生成されたファイルの確認

生成後、以下のファイルが存在することを確認してください：

```
icon.svg
icon-192.png
icon-512.png
```

## PWA マニフェストの確認

`manifest.json` でアイコンが正しく参照されていることを確認：

```json
"icons": [
  {
    "src": "icon.svg",
    "sizes": "any",
    "type": "image/svg+xml"
  },
  {
    "src": "icon-192.png",
    "sizes": "192x192",
    "type": "image/png"
  },
  {
    "src": "icon-512.png",
    "sizes": "512x512",
    "type": "image/png"
  }
]
```

## オンライン変換ツール

インストール不要で、オンラインツールを使用することもできます：

- [Convertio](https://convertio.co/svg-png/)
- [CloudConvert](https://cloudconvert.com/svg-to-png)
- [Online Convert](https://www.online-convert.com/convert-to-png)

1. `icon.svg` をアップロード
2. 192×192 と 512×512 の2つのサイズで変換
3. ダウンロード

## アイコンのカスタマイズ

アイコンデザインを変更したい場合：

1. `icon.svg` をテキストエディタ（またはイラストレーション用ソフト）で編集
2. 色、形状などを変更
3. 上記のいずれかの方法で PNG に再変換

### SVG編集のポイント

SVGファイルの主要な要素：

```svg
<!-- 南京錠の本体 -->
<rect ... fill="#16a085" />

<!-- 南京錠の上部（シャックル） -->
<path ... stroke="#1a5f5f" />

<!-- 鍵穴 -->
<circle ... fill="#0e3f2f" />
```

色コード：
- メイン色：`#16a085` （テーマカラー）
- ダーク色：`#0e6251`
- ライト色：`#1f9e7a`

## トラブルシューティング

### SVG が認識されない
- UTF-8エンコーディングを確認
- XML宣言 (`<?xml version="1.0"?>`) が不要（HTMLではXML不要）

### PNG 生成に失敗
- ファイルパスにスペースや特殊文字がないか確認
- SVGの構文が正しいか確認（XMLとして有効か）

### インストール後、アイコンが表示されない
- ブラウザのキャッシュをクリア
- Service Workerを再インストール（ブラウザ開発者ツールで確認）
- HTTPS通信で動作しているか確認（PWAはHTTPSが必須）

## 参考資料

- [Web App Manifest 仕様](https://www.w3.org/TR/appmanifest/)
- [PWA Icons ベストプラクティス](https://web.dev/add-manifest/#pwa-icon-requirements)
- [Service Worker API](https://developer.mozilla.org/ja/docs/Web/API/Service_Worker_API)
