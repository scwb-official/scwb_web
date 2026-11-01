# Contributing Guide

このプロジェクトは「静的HTML + 共有パーツ + 軽量JS」で構成されています。初めて触る人でも安全に更新できるよう、作業手順と約束事をまとめました。

## フォルダ構成の概要
- `index.html` ほか: トップや固定ページ
- `concert/`:
  - `concert.html`: 今年の予定・報告（トップ）
  - `concertXX.html`: 年別の活動報告（例: `concert24.html` は 2024年）
  - `year-nav.html`: 年リンクの共通パーツ（全年ページで使い回し）
  - `image/`: コンサート関連の画像
- `common/`:
  - `header.html`, `footer.html`: 共通ヘッダー/フッター（JSで差し込み）
- `css/style.css`: 全体スタイル
- `js/script.js`: 共有パーツの読み込みやUIの軽い挙動

## 共有パーツの仕組み
- ヘッダー/フッターの注入:
  - `js/script.js` の `injectHTML('include-header', 'common/header.html')` 等で読み込み
  - 各ページの `<div id="include-header"></div>` / `<div id="include-footer"></div>` が差し込み先
- 年ナビ（年リンク）の注入:
  - 各コンサートページの `<p id="concert-year-nav" class="year-nav"></p>` に
  - `concert/year-nav.html` を読み込み
  - 現在ページの年リンクは `aria-current="page"` と `.is-current` で自動強調

## 更新の基本ルール（チェックリスト）
- 画像: `<img ... loading="lazy" decoding="async">` を付与する
- 外部リンク: `target="_blank"` には `rel="noopener noreferrer"` を必ず付与
- 代替テキスト: `alt` は内容が伝わる文にする（装飾目的の画像は空文字 `alt=""`）
- 年ナビ: ページには必ず `<p id="concert-year-nav" class="year-nav"></p>` を置く（直接ベタ書きしない）
- CSS/HTMLのスタイル:
  - インデント2スペース、属性の並び順は大きくこだわらないが統一する
  - クラス命名は役割ベース（例: `.year-nav`, `.concert-photo` など）

## よくある作業
- 新しい年ページを追加する: `docs/ADDING_CONCERT_YEAR.md` を参照
- 画像を追加する: `concert/image/` に配置し、`<img ... loading="lazy" decoding="async">` で参照
- お知らせを追加する: `news/news.html` と `index.html`（トップの「お知らせ」欄）の両方に、同じ形式の `<li class="news-item">` を先頭へ追加する。トップは最新4件程度を残して古いものを削除
- 共通ナビの修正: `concert/year-nav.html` を編集（ソート順と表記ゆれに注意）
