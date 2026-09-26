# machapp

`index.html` は「画面の骨組み」を定義し、`script.js` は「その画面に対する動作」を追加します。

つまり、HTML が「入力フォームや結果表示の枠組み」を作り、JavaScript が「その枠組みに値を入れたり、計算したり、ボタンを押したときの処理をつけたり」する役割です。

---

## 1. HTML が DOM を作る

`index.html` には、次のような要素があります。

- 入力フォーム: `shipmentForm`
- 日付入力: `shipmentDate`
- 品種名入力: `varietyName`
- 規格一覧のコンテナ: `standardsGrid`
- 集計結果表示: `results`
- パレット枚数選択: `palletCount`
- 計算ボタン: `calculatePlanButton`

これらの要素には ID が付いていて、JavaScript から `document.getElementById(...)` で取得できます。

---

## 2. JavaScript が HTML を読み込んで制御する

`index.html` の最後で、次の読み込みがあります。

```html
<script src="script.js"></script>
```

このため、ブラウザは HTML を読んだあとに `script.js` を実行します。

`script.js` では最初に

```js
document.addEventListener('DOMContentLoaded', () => {
```

を使って、ページが読み終わった後に処理を開始しています。  
ここで重要なのは、HTML 要素がまだ未構築の状態で JavaScript を動かさないようにしていることです。

---

## 3. JS が規格入力欄を動的に作る

`script.js` では `standards` 配列をもとに、各規格の入力欄を自動生成しています。

```js
standardsGrid.innerHTML = standards.map(...)
```

この処理により、HTML には事前に書かれていない多数の入力欄が実行時に作られます。  
例えば `FGS`, `L`, `M`, `S`, `B3L`, `○8` などの項目がフォーム上に出ます。

---

## 4. フォーム送信時の流れ

フォーム送信時の処理は `form.addEventListener('submit', ...)` で定義されています。

動作の流れは次の通りです。

1. 入力された数値を取得
2. `records` を作る
3. 入力が正しいか確認
4. `calculateSummary(records)` で集計
5. 結果表示用の画面を更新
6. `results` を表示して `palletSettings` を開く

つまり、HTML のフォームから入力したデータを、JS が受け取り、計算して、画面に反映しています。

---

## 5. パレット計算の流れ

パレット枚数が選ばれて「積み分けを計算」ボタンを押すと、

```js
calculatePlanButton.addEventListener('click', ...)
```

が発火します。

- `palletCount` を取得
- `calculateSummary(currentRecords, palletCount)` で平均や換算数を更新
- `buildPalletPlan(...)` で各パレットへの配分を計算
- `renderPlan(...)` で画面に表示

このとき、`index.html` の `#palletPlan` などの要素が更新対象になります。

---

## 6. まとめ

- `index.html`: 画面の見た目と入力要素の配置
- `script.js`: その要素に対するイベント処理と計算ロジック

この 2 つの関係は「HTML が UI を定義し、JS が UI を動かす」という典型的な構成です。  
特に今回のコードでは、JS が DOM を操作して、入力欄の生成・計算・結果表示まで一手に担っています。

必要なら次に、「このアプリの処理の流れを 1 から 10 まで図解風に説明」することもできます。