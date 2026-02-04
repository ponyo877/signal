# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

物理信号通信アプリケーション。インターネットなしで音や光を使ってメッセージを送受信する。6つの通信チャネル（超音波FSK、可聴音FSK、画面明滅、色変調、4×4グリッド、QRコード）をサポート。

## よく使うコマンド

```bash
npm run dev          # 開発サーバー起動（http://localhost:3000、ホットリロード有効）
npm run build        # 本番ビルド（dist/index.html に単一HTMLファイル生成）
npm test             # テスト実行
npm run test:watch   # テストをウォッチモードで実行
```

### 単一テストファイルの実行

```bash
npx vitest run tests/protocol.test.ts
```

## アーキテクチャ

レイヤードアーキテクチャを採用:

- **src/application/** - 状態管理（Store: Observerパターン）、MessageService（チャネル調整）
- **src/domain/** - コアロジック。Protocol（メッセージ↔ビット変換）、BitReceiver（ビット受信ステートマシン）
- **src/channels/** - 6種類のチャネル実装。すべてBaseChannelを継承し`send()`と`startReceive()`を実装
- **src/infrastructure/** - ブラウザAPI抽象化（AudioManager、VideoManager、CanvasManager）
- **src/ui/** - UIコンポーネント。フレームワーク不使用のコンポーネントベース設計
- **src/types/** - 型定義とエラークラス
- **src/constants/** - チャネル設定、FSKパラメータ、閾値

## ビルドシステム

- TypeScriptの型チェック後、esbuildでバンドル
- scripts/build.ts が jsQR と qrcode-generator をCDNから取得しインライン化
- 最終成果物は外部依存なしの単一HTMLファイル（約93KB）

## チャネル実装のポイント

新しいチャネルを追加する場合:
1. `src/channels/`に`BaseChannel`を継承したクラスを作成
2. `IChannel`インターフェース（`send()`, `startReceive()`, `stopReceive()`）を実装
3. `src/channels/index.ts`のファクトリ関数に登録
4. `src/types/index.ts`のChannelType型に追加
5. `src/constants/index.ts`にチャネル設定を追加

## 主要な技術

- Web Audio API（周波数生成・解析、FSKモデム）
- Canvas API（視覚信号レンダリング）
- getUserMedia（カメラアクセス）
- 外部ライブラリ: jsQR（QR読み取り）、qrcode-generator（QR生成）
