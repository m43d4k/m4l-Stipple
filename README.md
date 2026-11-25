# Stipple

Sine / Pulse / Noise の3音源を備えた、外部 MIDI シーケンサー向けの Max for Live シンセサイザー。

## 使用方法

`Stipple_dev.amxd` を Live の MIDI トラックに読み込む。

開発版では、以下のファイルを同じフォルダに配置する。

- `_logic.maxpat`
- `_stipple_midi.maxpat`
- `_stipple_midi_event.gendsp`
- `_stipple_midi_voice.gendsp`

改修版は既存デバイスと差し替えず、新規インスタンスとして追加する。

## MIDI

発音モードを切り替える。

- Trigger：Note On で発音し、Decay で音の長さを決める。
- Gate：MIDI ノートの長さに従って発音する。

## SOUND

Sine / Pulse / Noise の各音源を独立して調整する。

| Parameter | Description |
| --- | --- |
| Mix | 音源の音量 |
| Attack | 立ち上がり時間 |
| Decay | 減衰時間（Gate では Release） |
| Width | パルス幅 |
| Color | ノイズの明暗 |

## PITCH

Sine / Pulse 共通のピッチを調整する。

| Parameter | Description |
| --- | --- |
| Pitch | ピッチ調整（±24 st） |
| Detune | ピッチの微調整（±50 cents） |
| Pitch Env | ピッチエンベロープの有効／無効 |
| Amount | ピッチ変調量 |
| Decay | ピッチの減衰時間 |

## ERROR

| Parameter | Description |
| --- | --- |
| Probability | 発音確率 |
| Jitter | 発音タイミングのランダムな遅延（0〜5 ms） |

## OUT

ステレオ出力の音量を調整する。

## 仕様

詳細は [SPEC.md](SPEC.md) を参照。