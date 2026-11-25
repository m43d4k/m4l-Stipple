# Stipple 仕様書

## 概要

`Stipple` は、Sine / Pulse / Noise を音源にした外部 MIDI シーケンサー向けの Max for Live シンセデバイスである。発音位置とノート長は外部シーケンサーで組み、Stipple では音の輪郭を作る。

## 方向性

- 精密でミニマルな電子音を作る
- rasternoton のような無機質なクリック、パルス、短いトーンを想定する
- ランダム要素は機械的な反復に小さな欠けやタイミングの揺れを加えるために使う

## Live Set の互換性

改修版は新規インスタンスとして使う前提とする。互換性の対象は、改修版のインスタンスで保存されたパラメータ値とオートメーションに限る。

## 改修範囲

- サイン波、パルス波、ノイズの 3 音源
- 音源ごとに調整できる Attack / Decay アンプエンベロープ
- Sine / Pulse 共通のピッチエンベロープ
- Sine / Pulse 共通の Pitch と Detune
- MIDI Trigger / MIDI Gate 共通の Probability と Jitter
- 出力 Level

## 入力モード

`Mode` で MIDI Trigger と MIDI Gate を切り替える。どちらもモノフォニックとする。

- **MIDI Trigger** は Note On で発音する AD。発音後の減衰は各音源の Decay で決める。
- **MIDI Gate** は Note On / Off をゲートとして扱う ASR。ノート長で音価を決め、ゲートが閉じた後は各音源の Decay でリリースする。

## 音源

音源はサイン波、パルス波、ノイズの 3 系統とする。

主役はサイン波とパルス波であり、ノイズはエッジ、粒子、ハット的な成分として扱う。

### Sine

役割:

- 丸いクリック
- 短いピッチ音
- 低域パルス
- ミニマルなトーン

基本的には主音源として扱う。

### Pulse

役割:

- 硬いデジタル感
- エッジの追加
- 短いブザー音
- デューティ比による音色変化

サイン波に対するエッジ成分として扱う。

推奨バランス:

```text
Sine 70-90%
Pulse 10-30%
```

### Noise

役割:

- クリックの立ち上がり
- 短いノイズバースト
- データ的な粒子音
- 高域のハット的な質感
- パルス波へのざらつきの追加

ノイズは主音源にせず、短い成分として混ぜる。

Noise Color で暗いノイズから明るいノイズまで調整する。

```text
dark = lowpass noise
neutral = white noise
bright = highpass noise
```

Noise Color の値に応じてノイズ成分のゲインを補正し、RMS をニュートラル（白色ノイズ）時にそろえる。

## ピッチ

MIDI Trigger / MIDI Gate の基準ピッチは、Live の A3（MIDI note 69）を 440 Hz とする。Detune は Sine と Pulse に共通で適用し、−50〜+50 cents の範囲で調整する。初期値は 0 cents とする。Pitch は両音源の基準音程を −24〜+24 st の範囲でリニアに調整する。初期値は 0 st、分解能は 0.01 st（1 cent）とする。Pitch の変化には時定数 2 ms のスムージングを適用する。

```text
midiHz = 440 * 2 ^ ((noteNumber - 69 + smoothedPitchSt) / 12 + detuneCents / 1200)
```

## アンプエンベロープ

Sine、Pulse、Noise にそれぞれ独立したアンプエンベロープを持たせ、音源ごとに Attack と Decay を調整できるようにする。各音源にエンベロープを適用した後でミックスする。

各エンベロープの Decay は、MIDI Trigger では発音後の減衰、MIDI Gate ではゲートが閉じた後のリリースに使う。

発音中に音源ごとの Attack または Decay を変更したときは、その時点のエンベロープ振幅を引き継ぎ、新しい速さで処理を続ける。

各音源の Attack の範囲は 0〜20 ms、Decay の範囲は 1〜500 ms とする。Attack でクリックの立ち上がりを調整する。短い Decay はクリックやデータ音、中程度ではピッチ感のあるパルス、長くするとミニマルなトーンになる。

Sine と Pulse の波形は共通の位相から生成する。

### リトリガー時の挙動

前の音の減衰やリリース中に次の発音が始まる場合、各アンプエンベロープの振幅と Sine／Pulse の共通位相を両方引き継ぐ実装を試聴の基準とする。

基準の実装に対して、振幅だけをリセットする場合と共通位相だけをリセットする場合を個別に比較する。単発のクリックの質感と高速連打時の音色を試聴し、選んだ挙動をデバイスの固定仕様とする。

## ピッチエンベロープ

Sine と Pulse に共通のピッチエンベロープを追加する。Jitter 適用後、アンプと同じタイミングで一度だけ立ち上げる。MIDI Trigger では各発音の開始時、MIDI Gate ではゲートが開くときに立ち上げる。ゲートが開いたまま音程が切り替わる場合は、進行中の減衰を続ける。

エンベロープは Decay のみとし、発音直後のピッチから基準ピッチへ高速に指数減衰する。DSP ではホストのサンプルレートに合わせて、エンベロープをサンプルごとに更新する。

| パラメータ | 範囲 | 初期値 |
| --- | --- | --- |
| Amount | −48〜+48 半音 | +24 半音 |
| Decay | 0.1〜500 ms | 10 ms |
| On/Off | ON / OFF | OFF |

範囲と初期値は初期実装用の暫定値とし、試聴後に調整する。

- **Amount** は発音直後のピッチと基準ピッチの差を設定する。正の値では上から、負の値では下から基準ピッチに戻る。
- **Decay** は、一定の設定で発音開始時のピッチ変調量の 1% に達するまでの時間とする。発音中に変更した場合は、その時点のエンベロープ値から新しい速さで減衰を続ける。
- **On/Off** はピッチへの適用を切り替える。オフの間もエンベロープは進行し、オンへ戻すとその時点の残量が反映される。

発音中の Amount と On/Off の変更は、進行中のエンベロープによるピッチ変化量に反映する。操作による急なピッチの飛びを抑えるため、変更を短く平滑化する。

## 操作子

改修範囲の操作子は以下の 19 項目とする。Drive は外部サチュレーターへ委譲する。

### MIDI

- Mode

### SOUND

- Sine、Pulse、Noise の各レベル
- Pulse Width
- Noise Color
- Sine Attack、Sine Decay
- Pulse Attack、Pulse Decay
- Noise Attack、Noise Decay

### PITCH

- Pitch と Detune
- Pitch Envelope の Amount、Decay、On/Off

### ERROR

- Probability
- Jitter

### OUT

- Level

## ランダムと欠落

### Probability

MIDI Trigger / MIDI Gate で、Note On ごとに発音確率を判定する。

```text
100% = 常に発音
80% = 20% の確率で欠落
```

MIDI Gate は、判定を通過した Note On と対応する Note Off をゲート処理に渡す。

### Jitter

MIDI Trigger と MIDI Gate の両方に、発音タイミングをランダムに遅らせる Jitter を適用する。Jitter の設定範囲は 0〜5 ms とし、適用する遅延量もこの範囲に収める。

- **MIDI Trigger** では、Note On ごとに遅延を決める。
- **MIDI Gate** では、MIDI ノートごとに遅延量を決め、対応する Note On と Note Off に同じ量を適用する。たとえば Jitter が 5 ms で、ある Note On に 3 ms の遅延が決まった場合、対応する Note Off も 3 ms 遅らせる。これにより、そのノートの長さと Note On／Off の順序を保つ。同じ音程の Note On が重なった場合は、Note Off を未対応のうち最も古い Note On に対応させる（FIFO）。

両モードで、異なるノート間のイベント順序も保つ。遅延後の時刻が同じイベントは入力順に処理する。連続するノートや重なるノートでは、ノートごとの遅延量を独立に抽選することよりも、イベント順序と各 MIDI ノート長の維持を優先する。

Jitter の設定変更は、その後に受け付ける Note On の遅延選択から適用する。確定した遅延量を保持し、MIDI Gate では設定変更後に届いた Note Off にも、対応する Note On で決めた遅延量を使う。

設定値を下げた直後は、確定済みの遅延に起因するイベント順序の制約が残る間に限り、新しい設定値を超える遅延を許容する。遅延量の絶対上限は 5 ms とする。

## 入力モード詳細

実装上は MIDI Trigger / MIDI Gate の各エンジンが並列に存在し、`Mode` は最終段で音声出力を選択する。両エンジンは入力に追従し、選択した側の音声を出力する。

Probability、Jitter、Gate のノート管理は Max のイベント処理用 `gen` で実行し、発音・消音を `pipe` に予約する。Gate が保持する未対応 Note On は、Probability で落ちたものも含めて最大 128 件とする。上限を超えた分は Gate の発音を見送り、同じ MIDI チャンネル・音程の Note Off と入力順に対応させる。上限を超えた場合は Max コンソールに表示する。

### MIDI Trigger

MIDI Note On で発音する。発音長と減衰は音源ごとの `Decay` が決める。

```text
MIDI note number -> standard MIDI pitch plus Pitch and Detune
MIDI velocity    -> hit strength
Note Off         -> ignored
length           -> per-source Decay
probability      -> applied per Note On
```

ステップごとにパラメータを保持できる外部 MIDI シーケンサーと組み合わせる用途を想定する。

### MIDI Gate

MIDI Note On / Off をゲートとして扱う。ゲート中は各エンベロープの目標振幅をベロシティに応じた値に保ち、ゲートを閉じた後に各音源の `Decay` でリリースする。

押下中のノートが重なる場合は、最後に押されたノートを優先する。そのノートを離すと、残っているノートのうち最後に押されたノートへ戻る。押下中ノートが 0 個になった時にゲートを閉じる。

```text
MIDI note number -> standard MIDI pitch plus Pitch and Detune
MIDI velocity    -> gate level / voice velocity
Note Off         -> gate close only when no notes remain held
release          -> per-source Decay
probability      -> applied per Note On before held-note tracking
```

外部 MIDI シーケンサーのノート長で音価を制御したい場合に使う。

## UI 方針

UI は装飾よりも精密な操作を優先する。

- Mode を明確に切り替えられるようにする
- 共通の音源操作子を見つけやすくする
- パネルは MIDI / SOUND / PITCH / ERROR / OUT に分ける
- Pitch は st、Detune は cents で数値表示する
- 波形やエンベロープの描画 UI を JavaScript で実装する場合は `v8ui` を使う
- 文字説明を多くせず、操作面として整理する

## 非目標

改修範囲の対象外は以下のとおり。

- 内蔵グリッドシーケンサー
- 複雑なモジュレーションマトリクス
- ポリフォニックな鍵盤シンセとしての完全対応
- 大量のオシレーター波形
- サンプル読み込み
- 高度なグリッチエフェクト
- Chromatic Pitch Mode
- Linear Hz Pitch Mode

## 実装メモ

- `_logic.maxpat` に MIDI 入力と発音ロジックを構築する
- `_logic.maxpat` は生成スクリプトで再生成せず、Max 上で直接管理する
- JavaScript を使う場合は v8 系を前提にする
- 描画 UI を JavaScript で実装する場合は `v8ui` を使う
- DSP は `gen~` 中心で実装する
- UI と DSP は可能な限り役割を分ける
- MIDI Trigger / MIDI Gate はモノフォニック入力として扱う
- Drive / saturation は後段の Live デバイスや外部プラグインに委譲する
- ピッチ確認時は Decay を長め、Noise を低め、Sine を高めにするとよい
