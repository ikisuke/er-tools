# ER ビューア

グループごとに分割された Mermaid の ER 図を、分割したまま横断して読むためのビューアです。図の中で「他のグループで定義された表」をリンクにし、押すとその表を定義しているグループの図へ移動します。図は読むだけで、書き換えません。

## できること

- 図の置き場所にあるグループから 1 つを選び、その ER 図を Mermaid でそのまま描画する（列・関係線のラベルは元の図のとおり）
- その図に属性ブロックが無く、関係線にだけ出てくる表をリンクにする
  - 同じ識別名を属性ブロック付きで定義しているグループが 1 つ → その図へ移動し、対象の表までスクロールして強調表示する
  - 複数ある → 候補を示して選ばせる
  - 無い → リンクにしない
- 照合は図に書かれたノードの識別名で行います（`PRODUCT["商品"]` の場合は `PRODUCT`）。表示名や部分一致では判断しません。大文字小文字も区別します
- ライト/ダークテーマは OS の設定に従います（図の配色も切り替わります）
- 表示中のグループと表は URL（`#g=<グループ>&e=<表>`）に入るので、ブラウザの戻る/進むが使えます

検索・絞り込み・書き出し・編集などは範囲外です。

## 技術構成

- **Vite + TypeScript**（UI フレームワークなし）と **mermaid** による静的サイト
- 図の読み込みは Vite プラグイン（`plugin/diagram-source.ts`）が行い、`diagrams.json` として配信します
  - 開発サーバーではリクエストのたびに読み直すため、図を作り直したらブラウザを再読み込みするだけで反映されます
  - `npm run build` では、その時点の図を `dist/diagrams.json` に書き出します
- 解析とリンク解決のロジックは `src/parse.ts`・`src/links.ts`・`src/svg.ts` にあり、Vitest で単体テストしています

UI が 1 画面で状態も少ないため、フレームワークを入れず DOM を直接扱う構成にしています。

## 使い方

Node.js 22 以降が必要です。

```bash
npm install
npm run dev          # http://127.0.0.1:47321 で同梱の例を表示
```

### 図の置き場所を指定する

環境変数 `ER_DIAGRAMS` に、**ディレクトリ** か **マニフェスト（JSON）** のパスを渡します。未指定なら `examples/diagrams` を読みます。

```bash
# ディレクトリ: 直下の .mmd / .mermaid / .md / .markdown を 1 ファイル = 1 グループとして読む
ER_DIAGRAMS=/path/to/diagrams npm run dev

# マニフェスト: グループ名と並び順を指定する
ER_DIAGRAMS=/path/to/manifest.json npm run dev

# 静的ファイルとして書き出す（dist/ を任意の静的サーバーで配信）
ER_DIAGRAMS=/path/to/diagrams npm run build
npm run preview      # http://127.0.0.1:47322 で確認
```

- ディレクトリ指定では、ファイル名（拡張子なし）がグループ名になります
- `.md` / `.markdown` では、`erDiagram` を含む最初の ```` ```mermaid ```` ブロックを図として読みます
- `erDiagram` が見つからないファイルや、グループ名の重複は読み飛ばし、画面上部に警告を出します

マニフェストの形式（`file` はマニフェストからの相対パス）:

```json
{
  "groups": [
    { "name": "顧客", "file": "diagrams/customers.mmd" },
    { "name": "注文", "file": "diagrams/orders.mmd" }
  ]
}
```

### 前提とする図の書き方

- 1 グループにつき 1 枚の ER 図
- そのグループが持つ表は属性ブロック付きで書く
- 他のグループの表は、関係線の中に識別名だけを書く（属性ブロックを付けない）

ツールはこの書き方を強制しません。書き方が異なる場合、リンクが付かないか、意図と違う表がリンクになります。

## 同梱の例

`examples/diagrams/` に 4 グループあります（`examples/manifest.json` は同じ図を日本語のグループ名で並べたマニフェスト）。

| グループ | 内容 |
| --- | --- |
| `customers` | 顧客と住所。`ORDER` が `orders` へのリンク |
| `orders` | 注文と明細。`PRODUCT` は一意、`ADDRESS` は候補選択（`customers` と `shipping` の両方で定義）、`PAYMENT` はどこにも定義が無いためリンクなし |
| `catalog` | Markdown ファイルの例。`PRODUCT["商品"]` のように表示名を付けても識別名で照合 |
| `shipping` | 倉庫・在庫・出荷 |

## 開発

```bash
npm test             # 単体テスト（Vitest）
npm run typecheck    # 型チェック
```
