# Stipple

Sine / Pulse / Noise を音源にした Max for Live シンセデバイス。

## 主な機能

- Sine / Pulse / Noise の 3 系統
- Attack / Decay エンベロープ
- Tune による基準周波数の調整
- Jitter による発音タイミングの調整
- stereo out

## 現在の実装

- Internal Grid / MIDI Trigger / MIDI Gate の 3 モード
- 32 columns x 8 rows のグリッド
- 起動時は row 0 に 4 step 間隔の最小パターンを配置
- Live BPM / Transport 同期
- Probability による Internal Grid の発音欠落
- Range による Internal Grid の行別ピッチ幅の調整
- Direction による Internal Grid の走査方向切り替え
- MIDI Trigger / MIDI Gate では MIDI note 60 を Tune の基準として発音
- MIDI Gate は重複ノート時に last-note priority で発音対象を決める
- Internal Grid / MIDI Trigger / MIDI Gate 共通の Jitter

## モード

モードは 3 つ。

- Internal Grid: 内蔵グリッドを Live Transport に同期して走査する
- MIDI Trigger: MIDI note on で発音し、鳴りの長さは Decay で調整する
- MIDI Gate: MIDI note on/off で発音の開閉を制御する

## 音源と主な操作子

- Sine: サイン波の音量を調整する
- Pulse: パルス波の音量を調整する
- Noise: ノイズの音量を調整する
- Attack: 発音の立ち上がり時間を調整する
- Decay: 発音後に音量が下がる時間を調整する
- Tune: 基準周波数を Hz で指定する
- Range: Internal Grid の最下段から最上段までのピッチ幅を octave で指定する
- Pulse Width: パルス波の幅を調整する
- Noise Color: ノイズの暗さから明るさまでを調整する
- Probability: Internal Grid のセル発音を確率で間引く
- Jitter: 発音タイミングに短い遅延を加える
