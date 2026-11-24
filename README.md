# Stipple

Sine / Pulse / Noise を音源にした、外部 MIDI シーケンサー向けの Max for Live シンセデバイス。

`Stipple_dev.amxd` を Live の MIDI トラックに読み込む。開発版のため、同じフォルダにある `_logic.maxpat`、`_stipple_midi.maxpat`、`_stipple_midi_event.gendsp`、`_stipple_voice.gendsp` を一緒に置く。改修版は Live Set に新規インスタンスとして追加する。

## モード

- **Trigger** は Note On で発音する。音源ごとの Attack と Decay で音の長さと輪郭を作る。
- **Gate** は音源ごとの Attack で立ち上がり、最後の Note Off から Release でリリースする。ノートが重なったときは最後に押したノートを優先する。

## 操作子

- **MIDI** で発音モードを切り替える。
- **SOUND** で各音源の Level、Attack、Decay（Gate では Release）と、Pulse Width、Noise Color を調整する。
- **PITCH** の Detune は Sine / Pulse 共通で、標準の MIDI ピッチから −50〜+50 cents の範囲でずらす。初期値は 0 cents。Pitch Env は Sine / Pulse の発音時のピッチをずらし、Decay の時間で戻す。
- **ERROR** の Probability は Note On を確率で間引く。Jitter は発音を最大 5 ms 遅らせ、Gate では対応する Note On と Note Off に同じ遅延量を使う。
- **OUT** の Level はステレオ出力の音量を調整する。

詳細は [SPEC.md](SPEC.md) を参照。
