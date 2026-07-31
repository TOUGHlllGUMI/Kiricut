# Kiricut

写真の背景をブラウザだけで自動削除・差し替えできるツールです。写真はサーバーに送信されず、すべて端末のブラウザ内(クライアントサイドのAIモデル)で処理されます。

## 使い方

1. 写真をドラッグ&ドロップ、または「写真を選ぶ」から選択
2. 自動で背景が削除される
3. 背景を透過・単色・好きな色・別の画像に差し替え可能
4. 「ダウンロード」でPNG保存

## 技術構成

- 素のHTML / CSS / JavaScript(ビルドツールなし)
- [@imgly/background-removal](https://github.com/imgly/background-removal-js)(ブラウザ内で動作するAIセグメンテーション)
- PWA対応(manifest.json + Service Worker)
