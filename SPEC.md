# Stipple 仕様書

## 概要

`Stipple` は、Sine / Pulse / Noise を音源にした Max for Live シンセデバイスである。

入力モードは Internal Grid / MIDI Trigger / MIDI Gate の 3 つである。どれか 1 つを主モードとして扱うのではなく、同じ音源と共通パラメータを異なる入力方法で鳴らす設計とする。

Internal Grid は内蔵グリッドで発音タイミングとピッチを決める。MIDI Trigger と MIDI Gate は外部 MIDI note でピッチと発音を制御する。

## 方向性

- 精密でミニマルな電子音を作る
- サイン波、パルス波、ノイズを音源にする
- 短いエンベロープでクリック、トーン、低域パルスを作る
- Internal Grid / MIDI Trigger / MIDI Gate を同格の入力モードとして扱う
- Internal Grid では、デバイス単体でパターンを生成できる
- MIDI Trigger / MIDI Gate では、外部 MIDI クリップや鍵盤から発音を制御できる
- Live の BPM と Transport への同期は Internal Grid で使う
- ランダム要素は控えめにし、Internal Grid の反復に小さな欠けを作る用途に限定する

## MVP

最初の実装範囲は以下とする。

共通:

- サイン波オシレーター
- パルス波オシレーター
- ノイズジェネレーター
- 調整可能な Attack / Decay エンベロープ
- Tune の基音 Hz 表示
- Internal Grid / MIDI Trigger / MIDI Gate 共通の Jitter による微小なタイミング揺れ
- 出力 Level

Internal Grid:

- 32 columns x 8 rows のグリッド
- 横方向の走査カーソル
- Live BPM 同期クロック
- Ratio 固定の行別ピッチ割り当て
- Internal Grid 用の Pitch Range octave 表示
- セルの ON/OFF
- セルの明るさまたは値による velocity
- Internal Grid 用の Probability による発音欠落

MIDI:

- MIDI Trigger
- MIDI Gate

## 入力モード

入力モードは `Mode` で切り替える。

```text
0. Internal Grid
1. MIDI Trigger
2. MIDI Gate
```

- Internal Grid: 内蔵グリッドを Live Transport に同期して発音する。
- MIDI Trigger: MIDI note on で発音し、note off は音価として使わない。
- MIDI Gate: MIDI note on/off を gate として扱い、音価を外部 MIDI で制御する。

## Internal Grid のグリッド

グリッドは Internal Grid モードで音を鳴らすタイミングと高さを決める表である。

```text
time →
pitch ↑

8 | . . x . . . x .
7 | . x . . . . . .
6 | . . . x . . . .
5 | . . . . . x . .
4 | x . . . x . . .
3 | . . . . . . . x
2 | . . x . . . . .
1 | . . . . x . . .
    1 2 3 4 5 6 7 8
```

- 横軸: 時間ステップ
- 縦軸: ピッチ
- セル ON: そのタイミングで発音
- セル値: velocity
- 現在列: 走査カーソル位置

32 columns の場合、1周は 32 step になる。

## Internal Grid

Internal Grid では、グリッド自体を内蔵シーケンサーとして扱う。

起動時は空グリッドではなく、row 0 に 4 step 間隔の最小パターンを持つ。

```text
Live Transport
↓
Tempo-synced Clock
↓
Scan Cursor
↓
Grid Pattern
↓
Voice Trigger
↓
Sine + Pulse + Noise Synth
↓
Output
```

各ステップの処理は以下。

1. クロックを受け取る
2. 走査カーソルを次の列へ進める
3. 現在列の ON セルを読む
4. 行から pitch を決める
5. セル値から velocity を決める
6. Probability を適用する
7. Jitter を適用する
8. サイン波、パルス波、ノイズを短く発音する

## BPM 同期

Internal Grid は Live の BPM と Transport に同期する。

### 動作

- Live 再生中のみ走査する
- Live 停止中は走査を停止する
- Live の再生開始位置、途中再生位置、ループ位置に追従する
- BPM 変更に追従する
- MVP 実装では Division 操作子は持たず、`plugsync~` の累積 beat 位置から 1/16 相当の絶対 step を算出する
- Internal Grid の実際の走査列は、絶対 step と `Direction` から決める

```text
absoluteStep = floor(beats * 4)
```

### Step Length

MVP 実装では step length は固定である。

```text
BPM 120, fixed 1/16-equivalent step
1 step = 0.125 sec
16 steps = 1 bar
32 steps = 2 bars
```

Division 操作子は廃止し、MVP 以降も固定 step length を基本とする。

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

## ピッチ

縦 8 行を pitch に割り当てる。

初期仕様では、下の行ほど低く、上の行ほど高くする。

```text
row 1 = lowest pitch
row 8 = highest pitch
```

MVP では Ratio Mode 固定とする。

Tune は基準周波数を Hz で決める。

```text
Tune: 20.0 Hz - 880.0 Hz
UI display: 261.63 Hz
```

Internal Grid では、Tune は row 1 の基音周波数になる。

MIDI Trigger / MIDI Gate では、MIDI note 60 が Tune の周波数になる。MIDI ノートは Tune からの半音差として扱う。

```text
midiHz = Tune * 2 ^ ((noteNumber - 60) / 12)
```

Pitch Range は Internal Grid 専用で、row 1 から row 8 までの広がりを octave で決める。

```text
Pitch Range: 0.0 oct - 4.0 oct
UI display: 2.0 oct
```

例:

```text
Tune = 55.0 Hz
Pitch Range = 3.0 oct

row 1 = 55.0 Hz
row 8 = 440.0 Hz
```

中間行は row 1 と row 8 の間に指数的に配置する。

```text
rowRatio = rowIndex / 7
rowHz = Tune * 2 ^ (PitchRangeOct * rowRatio)
```

この方式は鍵盤音程を厳密に弾くためではなく、スペアナや耳で確認しながら目的の周波数へ合わせるための設計である。

将来的な拡張候補として Chromatic Mode や Linear Hz Mode は考えられるが、MVP では実装しない。

## エンベロープ

短い Attack / Decay エンベロープを使う。

主な範囲:

```text
Attack: 0-10 ms
Decay: 1-5000 ms
```

Decay は音のキャラクターを決める最重要操作子のひとつである。

Attack はクリック感を調整するために使う。

- 短い Decay: クリック、データ音
- 中程度の Decay: ピッチ感のあるパルス
- 長い Decay: ミニマルなトーン

## 操作子

操作子は最大 16 個まで許容する。Drive は外部サチュレーターへ委譲し、MVP では 14 個に収める。

Grid のセル操作、Clear、Randomize は操作子数に含めない。

### SCAN

- Mode
- Direction (Internal Grid)

### GRID

- 32 x 8 cells
- Cell On/Off
- Cell Velocity
- Clear
- Randomize

### SOUND

- Sine Level
- Pulse Level
- Noise Level
- Pulse Width
- Noise Color
- Tune
- Pitch Range (Internal Grid)
- Attack
- Decay

### ERROR

- Probability (Internal Grid)
- Jitter

### OUT

- Level

### MVP 操作子一覧

```text
1. Mode
2. Direction (Internal Grid)
3. Attack
4. Decay
5. Tune
6. Pitch Range (Internal Grid)
7. Sine Level
8. Pulse Level
9. Noise Level
10. Pulse Width
11. Noise Color
12. Probability (Internal Grid)
13. Jitter
14. Level
```

## 最重要操作子

MVP で特に重要な操作子。

- Mode
- Attack
- Decay
- Tune
- Sine Level
- Pulse Level
- Noise Level
- Pulse Width
- Noise Color
- Jitter
- Level
- Direction (Internal Grid)
- Pitch Range (Internal Grid)
- Probability (Internal Grid)

## ランダムと欠落

Stipple の方向性では、ランダムを主役にしない。

ランダムはパターンを崩すためではなく、Internal Grid の機械的な反復に小さな欠けを作るために使う。

### Probability

Internal Grid で、セルが ON でも指定確率でのみ発音する。

```text
100% = 常に発音
80% = 20% の確率で欠落
```

### Jitter

発音タイミングに微小な遅延を加える。

推奨範囲:

```text
0-5 ms
```

Jitter は Internal Grid / MIDI Trigger / MIDI Gate すべての発音に適用する。

## 入力モード詳細

実装上は Internal Grid / MIDI Trigger / MIDI Gate の各エンジンが並列に存在し、`Mode` は最終段で audible な音声出力を選択する。選択されていないエンジンも内部処理や入力追従は継続するが、出力はミュートされる。

### Internal Grid

Live sync と内蔵 32 x 8 グリッドで発音する。

既存のセル値が velocity になり、行が pitch になる。

Live sync 中は beat 位置から絶対 step を算出し、`Direction` に応じて Internal Grid の走査列へ変換する。
`Direction` は Live sync と `bang` による手動進行の両方に効く。

```text
0 = forward
1 = reverse
2 = pingpong
3 = random
```

Live sync 中の各方向は以下のように絶対 step から列を決める。

```text
forward  = absoluteStep % 32
reverse  = 31 - (absoluteStep % 32)
pingpong = 0..31..0 の往復
random   = step 更新ごとにランダムな列
```

### MIDI Trigger

MIDI note on で発音する。

note off は音価としては使わない。発音長と減衰はデバイス側の `Decay` が決める。

```text
MIDI note number -> pitch relative to Tune
MIDI velocity    -> hit strength
note off         -> ignored
length           -> Decay
```

ステップごとにパラメータを保持できる外部 MIDI シーケンサーと組み合わせる用途を想定する。

### MIDI Gate

MIDI note on/off を gate として扱う。

note on 中は envelope target が velocity に保たれ、note off 後は `Decay` で減衰する。

MIDI Gate は一般的なモノシンセの挙動に合わせ、モノフォニック入力として押下中ノートを保持し、last-note priority で発音対象を決める。
重複ノート中は、最後に押されたノートを pitch として使う。最後に押されたノートを離した時に他のノートがまだ押されている場合は、直前に有効だった押下中ノートへ pitch を戻し、gate は閉じない。
gate は押下中ノートが 0 個になった時だけ閉じる。

```text
MIDI note number -> pitch relative to Tune
MIDI velocity    -> gate level / voice velocity
note off         -> gate close only when no notes remain held
release          -> Decay
```

キーボード演奏や通常の MIDI クリップで音価を外部から制御したい場合に使う。

### 将来的な拡張候補

- MIDI + Grid
- Free Rate Scan
- Audio Rate Scan

## Free Rate / Audio Rate Scan

将来的には BPM 同期から外し、Hz 指定で走査できるモードを追加する。

```text
Scan Rate: 20 Hz - 2 kHz
```

低速ではシーケンサー、高速では疑似ウェーブテーブルやデータ音として動作する。

MVP では実装しない。

## UI 方針

UI は装飾よりも精密な操作を優先する。

- Mode を明確に切り替えられるようにする
- 共通の音源操作子を見つけやすくする
- Internal Grid ではグリッドと現在の走査列を視覚表示する
- セル値は明るさで表す
- 操作子は少数で大きく効くものを優先する
- パネルは SCAN / GRID / SOUND / ERROR / OUT に分ける
- Tune は Hz で数値表示する
- Pitch Range は Internal Grid 用として oct で数値表示する
- グリッド描画、波形、エンベロープ、グリッド補助表示などの描画UIには `jsui` ではなく `v8ui` を使う
- 文字説明を多くせず、操作面として整理する

## 初期プリセット案

初期プリセット案は Internal Grid でのパターン作成例である。MIDI Trigger / MIDI Gate では外部 MIDI 入力を前提に、同じ音源設定を使う。

### Precise Clicks

- Step Length: fixed 1/16-equivalent
- Decay: 5 ms
- Tune: 261.63 Hz
- Pitch Range: 2.0 oct
- Sine Level: high
- Pulse Level: low
- Noise Level: low
- Pulse Width: 25%
- Noise Color: bright
- Probability: 100%
- Jitter: 0 ms

### Data Pulse

- Step Length: fixed 1/16-equivalent
- Decay: 12 ms
- Tune: 82.4 Hz
- Pitch Range: 3.0 oct
- Sine Level: medium
- Pulse Level: medium
- Noise Level: medium
- Pulse Width: 15%
- Noise Color: neutral
- Probability: 90%
- Jitter: 1 ms

### Low Stipple

- Step Length: fixed 1/16-equivalent
- Decay: 40 ms
- Tune: 55.0 Hz
- Pitch Range: 1.0 oct
- Sine Level: high
- Pulse Level: low
- Noise Level: off
- Probability: 100%
- Jitter: 0 ms

## 非目標

MVP では以下を実装しない。

- 複雑なモジュレーションマトリクス
- ポリフォニックな鍵盤シンセとしての完全対応
- 大量のオシレーター波形
- サンプル読み込み
- 高度なグリッチエフェクト
- Chromatic Pitch Mode
- Linear Hz Pitch Mode
- Audio Rate Scan

## 実装メモ

- `_logic.maxpat` にクロック、グリッド読み取り、発音ロジックを構築する
- `_logic.maxpat` は生成スクリプトで再生成せず、Max 上で直接管理する
- JavaScript を使う場合は v8 系を前提にする
- グリッドを含む描画UIを JavaScript で実装する場合は `v8ui` を使い、`jsui` は使わない
- DSP は `gen~` 中心で実装する
- UI と DSP は可能な限り役割を分ける
- Internal Grid の voice 数は 8 とする
- 同一列に複数セルがある場合は、Internal Grid では最大 8 voice まで同時に鳴らす
- MIDI Trigger / MIDI Gate はモノフォニック入力として扱う
- Drive / saturation は後段の Live デバイスや外部プラグインに委譲する
- ピッチ確認時は Decay を長め、Noise Level を低め、Sine Level を高めにするとよい
