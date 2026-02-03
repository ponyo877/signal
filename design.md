# Signal — 詳細設計書

## 1. 全体アーキテクチャ

### 1.1 アーキテクチャ概要図

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Signal Application                          │
├─────────────────────────────────────────────────────────────────────┤
│  Presentation Layer                                                  │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ UI Components                                                   ││
│  │ ┌─────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────────┐  ││
│  │ │ Header  │ │ ChatArea    │ │SignalPanel  │ │ControlArea    │  ││
│  │ └─────────┘ └─────────────┘ └─────────────┘ └───────────────┘  ││
│  │                     ┌─────────────────────┐                     ││
│  │                     │ FullscreenOverlay   │                     ││
│  │                     └─────────────────────┘                     ││
│  └─────────────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────────┤
│  Application Layer                                                   │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ ┌──────────────┐ ┌──────────────┐ ┌─────────────────┐          ││
│  │ │ AppState     │ │ EventBus     │ │ MessageService  │          ││
│  │ └──────────────┘ └──────────────┘ └─────────────────┘          ││
│  └─────────────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────────┤
│  Domain Layer                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ ┌──────────────┐ ┌──────────────┐ ┌─────────────────┐          ││
│  │ │ Protocol     │ │ BitReceiver  │ │ Message         │          ││
│  │ └──────────────┘ └──────────────┘ └─────────────────┘          ││
│  └─────────────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────────┤
│  Channel Layer                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐        ││
│  │ │Ultrasonic │ │ Audible   │ │Brightness │ │  Color    │        ││
│  │ │ Channel   │ │ Channel   │ │ Channel   │ │ Channel   │        ││
│  │ └───────────┘ └───────────┘ └───────────┘ └───────────┘        ││
│  │ ┌───────────┐ ┌───────────┐                                    ││
│  │ │  Grid     │ │    QR     │                                    ││
│  │ │ Channel   │ │ Channel   │                                    ││
│  │ └───────────┘ └───────────┘                                    ││
│  └─────────────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────────┤
│  Infrastructure Layer                                                │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐          ││
│  │ │ AudioManager  │ │ VideoManager  │ │CanvasManager  │          ││
│  │ └───────────────┘ └───────────────┘ └───────────────┘          ││
│  └─────────────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────────┤
│  External Libraries (Inlined)                                        │
│  ┌───────────────┐ ┌────────────────────┐                          │
│  │ jsQR 1.4.0    │ │ qrcode-generator   │                          │
│  │               │ │ 1.4.4              │                          │
│  └───────────────┘ └────────────────────┘                          │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 レイヤー責務定義

| レイヤー | 責務 | 依存方向 |
|---------|------|---------|
| Presentation | UI描画、ユーザー入力処理 | Application へ依存 |
| Application | アプリケーションロジック、状態管理 | Domain, Channel へ依存 |
| Domain | ビジネスロジック、プロトコル処理 | Infrastructure へ依存 |
| Channel | 各通信チャネルの実装 | Domain, Infrastructure へ依存 |
| Infrastructure | ブラウザAPI抽象化 | 外部APIのみ |

---

## 2. モジュール/クラス構成

### 2.1 クラス図

```
                          ┌─────────────────┐
                          │   <<interface>> │
                          │    IChannel     │
                          ├─────────────────┤
                          │+id: ChannelId   │
                          │+name: string    │
                          │+description: str│
                          ├─────────────────┤
                          │+send(msg)       │
                          │+startReceive()  │
                          │+stopReceive()   │
                          │+getVisualizer() │
                          └────────┬────────┘
                                   │
        ┌──────────────┬───────────┼───────────┬──────────────┐
        │              │           │           │              │
┌───────▼───────┐┌─────▼─────┐┌────▼────┐┌─────▼─────┐┌───────▼───────┐
│AudioChannel   ││BrightnessC││ColorChan││GridChannel││ QRChannel     │
│<<abstract>>   ││           ││         ││           ││               │
├───────────────┤├───────────┤├─────────┤├───────────┤├───────────────┤
│#audioManager  ││#videoMgr  ││#videoMgr││#videoMgr  ││#videoMgr      │
│#analyser      ││#threshold ││         ││#cells     ││#lastQR        │
├───────────────┤├───────────┤├─────────┤├───────────┤├───────────────┤
│+sendTone()    ││+detectBit ││+detectC ││+readGrid  ││+displayQR()   │
│+detectFreq()  ││           ││         ││           ││+scanQR()      │
└───────┬───────┘└───────────┘└─────────┘└───────────┘└───────────────┘
        │
┌───────▼───────┐┌───────────────┐
│UltrasonicChan ││ AudibleChannel│
├───────────────┤├───────────────┤
│FREQ_0=18000   ││FREQ_0=800     │
│FREQ_1=19000   ││FREQ_1=1600    │
│PILOT=17000    ││PILOT=400      │
└───────────────┘└───────────────┘
```

### 2.2 モジュール一覧

| モジュール | ファイル | 責務 |
|-----------|---------|------|
| Constants | src/constants/index.ts | 定数定義（周波数、タイミング等） |
| Types | src/types/index.ts | 型定義、インターフェース |
| Protocol | src/domain/protocol.ts | エンコード/デコードロジック |
| BitReceiver | src/domain/bit-receiver.ts | ビット受信ステートマシン |
| AudioManager | src/infrastructure/audio-manager.ts | Web Audio API操作 |
| VideoManager | src/infrastructure/video-manager.ts | getUserMedia(video)操作 |
| CanvasManager | src/infrastructure/canvas-manager.ts | Canvas描画操作 |
| UltrasonicChannel | src/channels/ultrasonic-channel.ts | 超音波チャネル |
| AudibleChannel | src/channels/audible-channel.ts | 可聴音チャネル |
| BrightnessChannel | src/channels/brightness-channel.ts | 画面明滅チャネル |
| ColorChannel | src/channels/color-channel.ts | 色変調チャネル |
| GridChannel | src/channels/grid-channel.ts | 空間グリッドチャネル |
| QRChannel | src/channels/qr-channel.ts | QRストリーミングチャネル |
| AppState | src/application/store.ts | グローバル状態管理 |
| EventBus | src/application/event-bus.ts | イベント通知 |
| MessageService | src/application/message-service.ts | メッセージ処理 |
| UIComponents | src/ui/components/*.ts | UI描画 |
| App | src/main.ts | 初期化と統合 |

---

## 3. インターフェース定義

### 3.1 チャネル関連型

```typescript
// チャネルID型
type ChannelId = 'ultrasonic' | 'audible' | 'brightness' | 'color' | 'grid' | 'qr';

// チャネル設定
interface ChannelConfig {
  readonly id: ChannelId;
  readonly name: string;
  readonly description: string;
  readonly pilotMs: number;
  readonly gapMs: number;
  readonly bitMs?: number;
  readonly frameMs?: number;
}

// チャネルインターフェース
interface IChannel {
  readonly config: ChannelConfig;

  send(message: string): Promise<void>;
  startReceive(): Promise<void>;
  stopReceive(): void;
  getVisualizer(): IVisualizer;
  isReceiving(): boolean;
  isSending(): boolean;
}

// ビジュアライザーインターフェース
interface IVisualizer {
  draw(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): void;
  getPreferredHeight(): number;
}
```

### 3.2 コールバック/イベント型

```typescript
// 受信コールバック
interface ReceiverCallbacks {
  onMessage: (message: string) => void;
  onError: (error: ReceiverError) => void;
  onStatusChange: (status: ReceiverStatus) => void;
}

// 受信状態
type ReceiverStatus =
  | { state: 'idle' }
  | { state: 'pilot' }
  | { state: 'gap' }
  | { state: 'receiving'; progress: number }
  | { state: 'success' }
  | { state: 'error'; message: string };

// エラー型
interface ReceiverError {
  type: 'checksum' | 'timeout' | 'permission' | 'decode';
  message: string;
}
```

### 3.3 メッセージ型

```typescript
type MessageDirection = 'sent' | 'received' | 'system';

interface ChatMessage {
  id: string;
  direction: MessageDirection;
  content: string;
  channel?: ChannelId;
  timestamp: Date;
}
```

### 3.4 アプリケーション状態型

```typescript
interface AppState {
  currentChannel: ChannelId;
  isReceiving: boolean;
  isSending: boolean;
  messages: ChatMessage[];
  signalPanelState: 'collapsed' | 'open' | 'expanded';
  receiverStatus: ReceiverStatus;
  inputText: string;
}
```

---

## 4. 状態管理設計

### 4.1 Store パターン

```typescript
class Store<T> {
  private state: T;
  private listeners: Set<(state: T) => void> = new Set();

  constructor(initialState: T) {
    this.state = initialState;
  }

  getState(): T {
    return this.state;
  }

  setState(updater: (prev: T) => T): void {
    this.state = updater(this.state);
    this.notify();
  }

  subscribe(listener: (state: T) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach(listener => listener(this.state));
  }
}
```

### 4.2 ビット受信ステートマシン

```
        ┌─────────┐
        │  idle   │◄────────────────────────────────────────┐
        └────┬────┘                                         │
             │ detectPilot() === true                       │
             ▼                                              │
        ┌─────────┐                                         │
        │  pilot  │                                         │
        └────┬────┘                                         │
             │ detectPilot() === false                      │
             ▼                                              │
        ┌─────────┐                                         │
        │   gap   │                                         │
        └────┬────┘                                         │
             │ elapsed >= GAP_MS × 0.6                      │
             ▼                                              │
        ┌─────────┐                                         │
        │  bits   │─────────────────────────────────────────┤
        └─────────┘  decode success / decode fail /         │
                     bits > 2000 (timeout)                  │
```

| 状態 | 遷移条件 | 動作 |
|------|----------|------|
| `idle` | パイロット検出関数がtrueを返す | `pilot`へ遷移 |
| `pilot` | パイロット検出関数がfalseに変わる | `gap`へ遷移、ギャップ開始時刻を記録 |
| `gap` | ギャップ開始から GAP_MS × 0.6 以上経過 | `bits`へ遷移 |
| `bits` | bitMs + guardMs 間隔でビット判定 | 必要ビット数が揃ったらデコード |
| `bits` | デコード成功 | メッセージコールバックを呼びidleへ |
| `bits` | デコード失敗 | エラーコールバックを呼びidleへ |
| `bits` | 蓄積ビット数が2000を超える | タイムアウトとしてidleへ |

---

## 5. 各チャネルの詳細実装設計

### 5.1 音声チャネル共通設計

#### 5.1.1 パラメータテーブル

| パラメータ | ultrasonic | audible |
|-----------|------------|---------|
| PILOT_FREQ | 17,000 Hz | 400 Hz |
| FREQ_0 | 18,000 Hz | 800 Hz |
| FREQ_1 | 19,000 Hz | 1,600 Hz |
| BIT_MS | 100 ms | 70 ms |
| GUARD_MS | 8 ms | 8 ms |
| THRESHOLD_DB | -42 dB | -40 dB |
| FFT_SIZE | 8192 | 8192 |

#### 5.1.2 送信シーケンス

```
┌────────────┐ ┌────┐ ┌───┐┌───┐┌───┐┌───┐┌───┐┌───┐┌───┐┌───┐
│   Pilot    │ │Gap │ │P0 ││P1 ││P2 ││P3 ││P4 ││P5 ││P6 ││P7 │ ...
│  700ms     │ │300 │ │bit││bit││bit││bit││bit││bit││bit││bit│
│  17kHz     │ │ ms │ │+G ││+G ││+G ││+G ││+G ││+G ││+G ││+G │
└────────────┘ └────┘ └───┘└───┘└───┘└───┘└───┘└───┘└───┘└───┘
                      ▲
                      │
             Preamble: 10101010
             Marker:   11111111
             Length:   8 bits
             Data:     N × 8 bits
             Checksum: 8 bits
```

#### 5.1.3 FFT解析

```typescript
// 周波数→FFTビンインデックス変換
// binIndex = frequency × fftSize / sampleRate

// 例: sampleRate=48000, fftSize=8192
// 17kHz → bin 2901
// 18kHz → bin 3072
// 19kHz → bin 3243
```

#### 5.1.4 FSK送信クラス

```typescript
class FSKTransmitter {
  private config: FSKChannelConfig;
  private context: AudioContext | null = null;

  async transmit(bits: number[]): Promise<void> {
    this.context = new AudioContext();
    const gainNode = this.context.createGain();
    gainNode.connect(this.context.destination);

    let currentTime = this.context.currentTime;

    // 1. パイロット信号
    currentTime = this.scheduleTone(
      gainNode, this.config.pilotFrequency,
      currentTime, this.config.pilotDurationMs
    );

    // 2. ギャップ
    currentTime += this.config.gapDurationMs / 1000;

    // 3. ビット列
    for (const bit of bits) {
      const freq = bit === 0 ? this.config.freq0 : this.config.freq1;
      currentTime = this.scheduleTone(gainNode, freq, currentTime, this.config.bitDurationMs);
      currentTime += this.config.guardIntervalMs / 1000;
    }

    // 完了待機後クローズ
    await this.waitAndClose(currentTime);
  }

  private scheduleTone(gainNode: GainNode, frequency: number, startTime: number, durationMs: number): number {
    const osc = this.context!.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, startTime);
    osc.connect(gainNode);

    const endTime = startTime + durationMs / 1000;
    const ramp = 0.002; // クリックノイズ軽減

    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(0.5, startTime + ramp);
    gainNode.gain.setValueAtTime(0.5, endTime - ramp);
    gainNode.gain.linearRampToValueAtTime(0, endTime);

    osc.start(startTime);
    osc.stop(endTime);

    return endTime;
  }
}
```

#### 5.1.5 FSK受信クラス

```typescript
class FSKReceiver {
  private analyser: AnalyserNode;
  private frequencyData: Float32Array;

  detectPilot(): boolean {
    this.analyser.getFloatFrequencyData(this.frequencyData);
    const binIndex = this.frequencyToBin(this.config.pilotFrequency);
    return this.frequencyData[binIndex] >= this.config.detectionThresholdDb;
  }

  detectBit(): 0 | 1 | null {
    this.analyser.getFloatFrequencyData(this.frequencyData);
    const power0 = this.frequencyData[this.frequencyToBin(this.config.freq0)];
    const power1 = this.frequencyData[this.frequencyToBin(this.config.freq1)];

    if (Math.max(power0, power1) < this.config.detectionThresholdDb) {
      return null;
    }
    return power1 > power0 ? 1 : 0;
  }

  private frequencyToBin(frequency: number): number {
    return Math.round((frequency * this.config.fftSize) / this.sampleRate);
  }
}
```

### 5.2 視覚チャネル共通設計

#### 5.2.1 パラメータテーブル

| パラメータ | brightness | color |
|-----------|------------|-------|
| BIT_MS | 250 ms | 280 ms |
| PILOT_COLOR | #FFFFFF (白) | #0000FF (青) |
| BIT_0_COLOR | #000000 (黒) | #FF0000 (赤) |
| BIT_1_COLOR | #FFFFFF (白) | #00FF00 (緑) |
| THRESHOLD | calibration + 40 | R/G比較 |

#### 5.2.2 輝度計算

```typescript
function calculateLuminance(imageData: ImageData, region: SamplingRegion): number {
  const { data, width } = imageData;
  let sum = 0;
  let count = 0;

  for (let y = region.y; y < region.y + region.height; y += region.step) {
    for (let x = region.x; x < region.x + region.width; x += region.step) {
      const i = (y * width + x) * 4;
      // ITU-R BT.709 輝度計算式
      const luminance = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      sum += luminance;
      count++;
    }
  }

  return count > 0 ? sum / count : 0;
}
```

#### 5.2.3 RGB計算（colorチャネル用）

```typescript
function calculateAverageRGB(imageData: ImageData, region: SamplingRegion): { r: number; g: number; b: number } {
  const { data, width } = imageData;
  let sumR = 0, sumG = 0, sumB = 0;
  let count = 0;

  for (let y = region.y; y < region.y + region.height; y += region.step) {
    for (let x = region.x; x < region.x + region.width; x += region.step) {
      const i = (y * width + x) * 4;
      sumR += data[i];
      sumG += data[i + 1];
      sumB += data[i + 2];
      count++;
    }
  }

  return { r: sumR / count, g: sumG / count, b: sumB / count };
}

// パイロット検出（青）
function detectBluePilot(rgb: { r: number; g: number; b: number }): boolean {
  return rgb.b > 100 && rgb.b > rgb.r * 1.3 && rgb.b > rgb.g * 1.3;
}
```

#### 5.2.4 中央領域サンプリング

```typescript
// 画面中央20%の正方形領域
function getCenterRegion(imageWidth: number, imageHeight: number): SamplingRegion {
  const size = Math.min(imageWidth, imageHeight) * 0.2;
  return {
    x: Math.floor((imageWidth - size) / 2),
    y: Math.floor((imageHeight - size) / 2),
    width: Math.floor(size),
    height: Math.floor(size),
    step: 2  // 2ピクセル間隔
  };
}
```

### 5.3 グリッドチャネル設計

#### 5.3.1 4×4グリッドマッピング

```
┌────┬────┬────┬────┐
│ B0 │ B1 │ B2 │ B3 │  ← High byte (bits 7-0)
├────┼────┼────┼────┤
│ B4 │ B5 │ B6 │ B7 │
├────┼────┼────┼────┤
│ B8 │ B9 │B10 │B11 │  ← Low byte (bits 7-0)
├────┼────┼────┼────┤
│B12 │B13 │B14 │B15 │
└────┴────┴────┴────┘

Cell Index = row × 4 + col
1フレーム = 16ビット = 2バイト
```

#### 5.3.2 フレーム構造

```
[Pilot: 全白 800ms] → [Gap: 全黒 400ms] → [Data Frames 400ms each] → [Checkerboard 500ms]

ペイロード: [データ長(1byte)][データ本体(N bytes)][XORチェックサム(1byte)]
※ 奇数バイトの場合は0x00パディング
```

#### 5.3.3 チェッカーボード検出

```typescript
function isCheckerboard(bits: number[], tolerance: number = 0.75): boolean {
  let matchCount = 0;
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const index = row * 4 + col;
      const expected = (row + col) % 2;
      if (bits[index] === expected) matchCount++;
    }
  }
  return matchCount / 16 >= tolerance;  // 75%以上で許容
}
```

### 5.4 QRチャネル設計

#### 5.4.1 送信フロー

```typescript
class QRTransmitter {
  async displayQR(message: string): Promise<void> {
    // qrcode-generator使用
    const qr = qrcode(0, 'M');  // エラー訂正レベルM (15%)
    qr.addData(message);
    qr.make();

    // 画面短辺の85%サイズで表示
    const size = Math.min(window.innerWidth, window.innerHeight) * 0.85;

    // 3秒間表示
    overlay.show();
    overlay.drawQR(qr.modules, qr.getModuleCount());
    await sleep(3000);
    overlay.hide();
  }
}
```

#### 5.4.2 受信フロー

```typescript
class QRReceiver {
  private lastDecodedData: string = '';

  processFrame(imageData: ImageData): void {
    const code = jsQR(imageData.data, imageData.width, imageData.height);

    if (code && code.data !== this.lastDecodedData) {
      this.lastDecodedData = code.data;
      this.onMessage(code.data);

      // 四隅を緑枠で表示
      this.drawCorners(code.location);
    }
  }
}
```

---

## 6. UIコンポーネント設計

### 6.1 コンポーネント階層

```
App
├── Header
│   ├── AppTitle
│   └── ChannelSelector
│       └── ChannelButton (×6)
├── ChatArea
│   └── ChatMessage (×N)
├── SignalPanel
│   ├── PanelHeader
│   │   ├── ChannelName
│   │   └── StatusMessage
│   └── VisualizationCanvas
└── ControlArea
    ├── MessageInput
    ├── SendButton
    └── ReceiveToggleButton
```

### 6.2 全体レイアウト

```
┌─────────────────────────┐
│ ヘッダー                 │ ← 固定、チャネル選択
├─────────────────────────┤
│                         │
│ チャットエリア            │ ← スクロール可能
│                         │
├─────────────────────────┤
│ シグナルパネル            │ ← 展開/折畳み可能
├─────────────────────────┤
│ コントロール              │ ← 固定、入力・送信・受信
└─────────────────────────┘
```

### 6.3 シグナルパネル状態

| 状態 | 高さ | 用途 |
|------|------|------|
| collapsed | 0px | 非表示 |
| open | 180px | 音声チャネル受信/送信時 |
| expanded | 260px | 視覚チャネル（カメラ映像表示） |

### 6.4 全画面オーバーレイ

```typescript
class SignalOverlay {
  show(onCancel?: () => void): void;
  hide(): void;
  setStatus(message: string): void;
  fillColor(color: string): void;      // brightness/colorチャネル用
  drawGrid(bits: number[]): void;      // gridチャネル用
  drawQR(modules: boolean[][], count: number): void;  // qrチャネル用
}
```

### 6.5 CSS設計（モバイルファースト）

```css
:root {
  /* カラーパレット */
  --color-bg: #1a1a2e;
  --color-surface: #16213e;
  --color-surface-raised: #1f3460;
  --color-primary: #4361ee;
  --color-primary-light: #4cc9f0;
  --color-accent: #f72585;
  --color-text: #edf2f4;
  --color-text-muted: #8d99ae;

  /* メッセージカラー */
  --color-sent: #4361ee;
  --color-received: #2a9d8f;
  --color-system: #6c757d;

  /* レイアウト */
  --header-height: 100px;
  --control-height: 64px;
  --signal-panel-collapsed: 0px;
  --signal-panel-open: 180px;
  --signal-panel-expanded: 260px;

  /* Safe Area (iOS用) */
  --safe-top: env(safe-area-inset-top, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);

  /* 間隔 */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;

  /* 角丸 */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 16px;
  --radius-full: 9999px;
}

*, *::before, *::after {
  box-sizing: border-box;
}

html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--color-bg);
  color: var(--color-text);
  -webkit-text-size-adjust: 100%;
}

body {
  display: flex;
  flex-direction: column;
  max-width: 480px;
  margin: 0 auto;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
}

/* iOS Safari フォールバック */
@supports not (height: 100dvh) {
  body {
    height: -webkit-fill-available;
  }
}
```

---

## 7. ファイル/ディレクトリ構成

### 7.1 開発時構成

```
signal/
├── src/
│   ├── types/
│   │   ├── index.ts              # 型定義エクスポート
│   │   ├── channel.ts            # チャネル関連型
│   │   ├── message.ts            # メッセージ関連型
│   │   └── state.ts              # 状態関連型
│   │
│   ├── constants/
│   │   └── index.ts              # 定数定義
│   │
│   ├── domain/
│   │   ├── protocol.ts           # プロトコルエンコード/デコード
│   │   └── bit-receiver.ts       # ビット受信ステートマシン
│   │
│   ├── infrastructure/
│   │   ├── audio-manager.ts      # Web Audio API操作
│   │   ├── video-manager.ts      # カメラ/映像操作
│   │   └── canvas-manager.ts     # Canvas描画操作
│   │
│   ├── channels/
│   │   ├── base-channel.ts       # 基底クラス
│   │   ├── ultrasonic-channel.ts # 超音波チャネル
│   │   ├── audible-channel.ts    # 可聴音チャネル
│   │   ├── brightness-channel.ts # 画面明滅チャネル
│   │   ├── color-channel.ts      # 色変調チャネル
│   │   ├── grid-channel.ts       # 空間グリッドチャネル
│   │   └── qr-channel.ts         # QRストリーミングチャネル
│   │
│   ├── application/
│   │   ├── store.ts              # 状態管理Store
│   │   └── message-service.ts    # メッセージサービス
│   │
│   ├── ui/
│   │   ├── components/
│   │   │   ├── header.ts
│   │   │   ├── chat-area.ts
│   │   │   ├── signal-panel.ts
│   │   │   ├── control-area.ts
│   │   │   └── fullscreen-overlay.ts
│   │   ├── styles.ts             # CSSテンプレート
│   │   └── renderer.ts           # DOM操作ユーティリティ
│   │
│   ├── lib/
│   │   ├── jsqr.ts               # jsQRインライン化
│   │   └── qrcode-generator.ts   # qrcode-generatorインライン化
│   │
│   └── main.ts                   # エントリポイント
│
├── dist/
│   └── index.html                # ビルド出力（シングルHTML）
│
├── scripts/
│   ├── build.ts                  # ビルドスクリプト
│   └── update-libs.ts            # ライブラリ更新スクリプト
│
├── tests/
│   ├── protocol.test.ts          # プロトコルテスト
│   └── bit-receiver.test.ts      # ビット受信テスト
│
├── package.json
├── tsconfig.json
├── Makefile
├── requirements.md
└── design.md
```

### 7.2 ビルド後構成（シングルHTMLファイル）

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Signal</title>
  <style>/* 全CSSをインライン化 */</style>
</head>
<body>
  <div id="app"></div>
  <script>
    /* jsQR ライブラリ */
    /* qrcode-generator ライブラリ */
    /* アプリケーションコード */
  </script>
</body>
</html>
```

---

## 8. ビルドパイプライン

### 8.1 ビルドフロー

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. TypeScript Compile                                            │
│    tsc --target ES2020 --module ES2020                          │
│    → src/**/*.ts → build/**/*.js                                │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. Bundle                                                        │
│    esbuild src/main.ts --bundle --outfile=build/bundle.js       │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Inline Libraries                                              │
│    jsQR 1.4.0 + qrcode-generator 1.4.4 を結合                   │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Generate HTML                                                 │
│    template.html にCSS、JSを埋め込み                             │
│    → dist/index.html                                            │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2 Makefile

```makefile
.PHONY: all build clean test update-libs dev

all: build

build:
	npx tsc
	npx esbuild src/main.ts --bundle --outfile=build/bundle.js --target=es2020
	node scripts/build.js

clean:
	rm -rf build dist

test:
	npx vitest run

update-libs:
	node scripts/update-libs.js

dev:
	npx esbuild src/main.ts --bundle --outfile=dev/bundle.js --servedir=dev --watch
```

### 8.3 tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ES2020",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./build",
    "rootDir": "./src",
    "declaration": true,
    "sourceMap": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "build", "dist", "tests"]
}
```

### 8.4 package.json

```json
{
  "name": "signal",
  "version": "1.0.0",
  "description": "物理信号を使ったオフライン通信アプリ",
  "type": "module",
  "scripts": {
    "build": "make build",
    "dev": "make dev",
    "test": "vitest run",
    "test:watch": "vitest",
    "clean": "make clean"
  },
  "devDependencies": {
    "typescript": "^5.9.3",
    "esbuild": "^0.20.0",
    "vitest": "^1.0.0"
  }
}
```

---

## 9. エラーハンドリング戦略

### 9.1 エラー分類

| カテゴリ | エラー型 | 発生箇所 | 対処 |
|---------|---------|---------|------|
| Permission | PermissionDeniedError | getUserMedia | UIにエラー表示、受信停止 |
| Protocol | ChecksumError | Protocol.decode | ステータス表示、受信継続 |
| Protocol | DecodeError | Protocol.decode | ステータス表示、受信継続 |
| Protocol | MessageTooLongError | Protocol.encode | 送信ブロック、UIにエラー表示 |
| Timeout | ReceiveTimeoutError | BitReceiver | ステータス表示、状態リセット |
| Device | DeviceNotFoundError | getUserMedia | UIにエラー表示 |
| Browser | APINotSupportedError | 初期化時 | UIにエラー表示 |

### 9.2 カスタムエラー階層

```typescript
abstract class SignalError extends Error {
  abstract readonly code: string;
  abstract readonly userMessage: string;
}

class PermissionDeniedError extends SignalError {
  readonly code = 'PERMISSION_DENIED';
  readonly userMessage = 'マイク/カメラへのアクセスが拒否されました';
}

class ChecksumError extends SignalError {
  readonly code = 'CHECKSUM_ERROR';
  readonly userMessage = 'データ検証に失敗しました';
}

class MessageTooLongError extends SignalError {
  readonly code = 'MESSAGE_TOO_LONG';
  readonly userMessage = 'メッセージが200バイトを超えています';
}

class ReceiveTimeoutError extends SignalError {
  readonly code = 'RECEIVE_TIMEOUT';
  readonly userMessage = '受信がタイムアウトしました';
}

class DeviceNotFoundError extends SignalError {
  readonly code = 'DEVICE_NOT_FOUND';
  readonly userMessage = 'マイク/カメラが見つかりません';
}

class APINotSupportedError extends SignalError {
  readonly code = 'API_NOT_SUPPORTED';
  readonly userMessage = 'このブラウザはサポートされていません';
}
```

### 9.3 リカバリーフロー

```
Permission Error:
  └─► 受信モード停止
      └─► メディアリソース解放
          └─► エラーメッセージ表示
              └─► idle状態へ

Checksum Error:
  └─► "fail!" ステータス表示
      └─► ビットバッファリセット
          └─► 受信継続（次のパイロット待機）

Timeout Error:
  └─► "timeout" ステータス表示
      └─► ステートマシンをidleへリセット
          └─► 受信継続（次のパイロット待機）
```

### 9.4 グローバルエラーハンドラー

```typescript
class ErrorHandler {
  handle(error: unknown): void {
    if (error instanceof SignalError) {
      this.showUserMessage(error.userMessage);
      this.logError(error);
    } else if (error instanceof Error) {
      this.showUserMessage('予期せぬエラーが発生しました');
      this.logError(error);
    }
  }

  private showUserMessage(message: string): void {
    // ステータス表示を更新
    store.setState(prev => ({
      ...prev,
      receiverStatus: { state: 'error', message }
    }));
  }

  private logError(error: Error): void {
    console.error(`[Signal Error] ${error.message}`, error);
  }
}
```

---

## 10. テスト設計

### 10.1 ユニットテスト

```typescript
// Protocol Tests
describe('Protocol', () => {
  describe('encode', () => {
    it('should encode ASCII message correctly', () => {
      const bits = Protocol.encode('Hi');
      expect(bits.length).toBeGreaterThan(24); // preamble + marker + length + data + checksum
    });

    it('should encode Japanese message correctly', () => {
      const bits = Protocol.encode('こんにちは');
      const decoded = Protocol.decode(bits);
      expect(decoded).toBe('こんにちは');
    });

    it('should encode emoji correctly', () => {
      const bits = Protocol.encode('👋');
      const decoded = Protocol.decode(bits);
      expect(decoded).toBe('👋');
    });

    it('should throw error for message > 200 bytes', () => {
      const longMessage = 'a'.repeat(201);
      expect(() => Protocol.encode(longMessage)).toThrow(MessageTooLongError);
    });

    it('should include correct preamble 10101010', () => {
      const bits = Protocol.encode('A');
      expect(bits.slice(0, 8)).toEqual([1, 0, 1, 0, 1, 0, 1, 0]);
    });

    it('should include correct start marker 11111111', () => {
      const bits = Protocol.encode('A');
      expect(bits.slice(8, 16)).toEqual([1, 1, 1, 1, 1, 1, 1, 1]);
    });

    it('should calculate correct checksum', () => {
      const bits = Protocol.encode('AB');
      // 'A' = 65, 'B' = 66, XOR = 3
      const decoded = Protocol.decode(bits);
      expect(decoded).toBe('AB');
    });
  });

  describe('decode', () => {
    it('should decode valid bit array', () => {
      const original = 'Hello';
      const bits = Protocol.encode(original);
      const decoded = Protocol.decode(bits);
      expect(decoded).toBe(original);
    });

    it('should return null for invalid checksum', () => {
      const bits = Protocol.encode('test');
      bits[bits.length - 1] ^= 1; // 最後のビットを反転
      expect(Protocol.decode(bits)).toBeNull();
    });

    it('should return null if start marker not found', () => {
      const bits = [0, 0, 0, 0, 0, 0, 0, 0]; // 開始マーカーなし
      expect(Protocol.decode(bits)).toBeNull();
    });

    it('should handle multi-byte UTF-8 correctly', () => {
      const original = 'Hello, 世界! 👋';
      const bits = Protocol.encode(original);
      const decoded = Protocol.decode(bits);
      expect(decoded).toBe(original);
    });
  });

  describe('roundtrip', () => {
    it('should encode and decode correctly', () => {
      const testCases = ['A', 'Hello', 'こんにちは', '🎉🎊', 'Mixed 日本語 and emoji 👍'];
      testCases.forEach(original => {
        const bits = Protocol.encode(original);
        const decoded = Protocol.decode(bits);
        expect(decoded).toBe(original);
      });
    });
  });
});

// BitReceiver Tests
describe('BitReceiver', () => {
  let receiver: BitReceiver;
  let mockCallbacks: ReceiverCallbacks;

  beforeEach(() => {
    mockCallbacks = {
      onMessage: vi.fn(),
      onError: vi.fn(),
      onStatusChange: vi.fn(),
    };
    receiver = new BitReceiver(mockCallbacks);
  });

  it('should transition from idle to pilot on pilot detection', () => {
    receiver.processPilotDetected(true);
    expect(receiver.getState()).toBe('pilot');
  });

  it('should transition from pilot to gap when pilot ends', () => {
    receiver.processPilotDetected(true);
    receiver.processPilotDetected(false);
    expect(receiver.getState()).toBe('gap');
  });

  it('should transition from gap to bits after gap duration', async () => {
    receiver.processPilotDetected(true);
    receiver.processPilotDetected(false);
    await sleep(200); // GAP_MS × 0.6 以上
    receiver.tick();
    expect(receiver.getState()).toBe('bits');
  });

  it('should accumulate bits correctly', () => {
    // 状態をbitsに遷移させてからビットを追加
    receiver.setState('bits');
    receiver.addBit(1);
    receiver.addBit(0);
    receiver.addBit(1);
    expect(receiver.getBits()).toEqual([1, 0, 1]);
  });

  it('should timeout after 2000 bits', () => {
    receiver.setState('bits');
    for (let i = 0; i < 2001; i++) {
      receiver.addBit(i % 2);
    }
    expect(mockCallbacks.onError).toHaveBeenCalled();
    expect(receiver.getState()).toBe('idle');
  });

  it('should call onMessage callback on successful decode', () => {
    const bits = Protocol.encode('test');
    receiver.setState('bits');
    bits.forEach(bit => receiver.addBit(bit));
    receiver.tryDecode();
    expect(mockCallbacks.onMessage).toHaveBeenCalledWith('test');
  });

  it('should call onError callback on checksum error', () => {
    const bits = Protocol.encode('test');
    bits[bits.length - 1] ^= 1; // チェックサムを壊す
    receiver.setState('bits');
    bits.forEach(bit => receiver.addBit(bit));
    receiver.tryDecode();
    expect(mockCallbacks.onError).toHaveBeenCalled();
  });
});
```

### 10.2 手動E2Eテストケース

| テストID | シナリオ | 手順 | 期待結果 |
|----------|---------|------|---------|
| E2E-001 | 超音波送受信 | 端末Aで「test」送信、端末Bで受信 | 端末Bに「test」表示 |
| E2E-002 | 可聴音送受信 | 端末Aで「こんにちは」送信、端末Bで受信 | 端末Bに「こんにちは」表示 |
| E2E-003 | 画面明滅送受信 | 端末Aで「1234」送信、端末Bで受信 | 端末Bに「1234」表示 |
| E2E-004 | 色変調送受信 | 端末Aで絵文字送信、端末Bで受信 | 端末Bに絵文字表示 |
| E2E-005 | グリッド送受信 | 端末Aで長文送信、端末Bで受信 | 端末Bに長文表示 |
| E2E-006 | QR送受信 | 端末AでQR表示、端末Bでスキャン | 端末Bにメッセージ表示 |
| E2E-007 | チャネル切替 | 受信中にチャネル切替 | リソース解放確認 |
| E2E-008 | 200バイト上限 | 200バイト超メッセージ送信 | エラー表示 |
| E2E-009 | ノイズ耐性 | 騒がしい環境で音声チャネル | 受信成功率確認 |
| E2E-010 | 連続送受信 | 複数メッセージ連続送受信 | 全メッセージ受信 |

### 10.3 テスト実行方法

```bash
# ユニットテスト実行
npm test

# ウォッチモードで実行
npm run test:watch

# カバレッジレポート
npm test -- --coverage
```

---

## 付録A. プロトコル詳細

### A.1 フレーム構造（QR以外の5チャネル共通）

```
[パイロット信号] → [ギャップ] → [プリアンブル] → [開始マーカー] → [データ長] → [データ本体] → [チェックサム]
```

| フィールド | サイズ | 値 | 説明 |
|------------|--------|-----|------|
| パイロット信号 | 700 ms | チャネル依存 | 通信開始の検出用 |
| ギャップ | 300 ms | 無信号 | パイロットとデータの境界 |
| プリアンブル | 8 bits | `10101010` | クロック同期用 |
| 開始マーカー | 8 bits | `11111111` | データ開始の確定マーカー |
| データ長 | 8 bits | 0–200 | データ本体のバイト数 |
| データ本体 | N × 8 bits | UTF-8バイト列 | メッセージ本文 |
| チェックサム | 8 bits | XOR | 全データバイトの排他的論理和 |

### A.2 エンコード実装

```typescript
class Protocol {
  private static readonly PREAMBLE = [1, 0, 1, 0, 1, 0, 1, 0];
  private static readonly START_MARKER = [1, 1, 1, 1, 1, 1, 1, 1];
  private static readonly MAX_BYTES = 200;

  static encode(message: string): number[] {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(message);

    if (bytes.length > this.MAX_BYTES) {
      throw new MessageTooLongError();
    }

    const bits: number[] = [];

    // プリアンブル
    bits.push(...this.PREAMBLE);

    // 開始マーカー
    bits.push(...this.START_MARKER);

    // データ長 (8ビット、MSBファースト)
    bits.push(...this.byteToBits(bytes.length));

    // データ本体
    for (const byte of bytes) {
      bits.push(...this.byteToBits(byte));
    }

    // チェックサム (XOR)
    const checksum = bytes.reduce((acc, byte) => acc ^ byte, 0);
    bits.push(...this.byteToBits(checksum));

    return bits;
  }

  private static byteToBits(byte: number): number[] {
    const bits: number[] = [];
    for (let i = 7; i >= 0; i--) {
      bits.push((byte >> i) & 1);
    }
    return bits;
  }
}
```

### A.3 デコード実装

```typescript
class Protocol {
  static decode(bits: number[]): string | null {
    // 開始マーカー（8個連続の1）を探す
    const markerIndex = this.findStartMarker(bits);
    if (markerIndex === -1) return null;

    const dataStart = markerIndex + 8;

    // データ長を読み取る
    const lengthBits = bits.slice(dataStart, dataStart + 8);
    if (lengthBits.length < 8) return null;
    const dataLength = this.bitsToNumber(lengthBits);

    // データを読み取る
    const dataBytes: number[] = [];
    let bitIndex = dataStart + 8;

    for (let i = 0; i < dataLength; i++) {
      const byteBits = bits.slice(bitIndex, bitIndex + 8);
      if (byteBits.length < 8) return null;
      dataBytes.push(this.bitsToNumber(byteBits));
      bitIndex += 8;
    }

    // チェックサム検証
    const checksumBits = bits.slice(bitIndex, bitIndex + 8);
    if (checksumBits.length < 8) return null;
    const receivedChecksum = this.bitsToNumber(checksumBits);
    const calculatedChecksum = dataBytes.reduce((acc, byte) => acc ^ byte, 0);

    if (receivedChecksum !== calculatedChecksum) return null;

    // UTF-8デコード
    const decoder = new TextDecoder();
    return decoder.decode(new Uint8Array(dataBytes));
  }

  private static findStartMarker(bits: number[]): number {
    for (let i = 0; i <= bits.length - 8; i++) {
      if (bits.slice(i, i + 8).every(bit => bit === 1)) {
        return i;
      }
    }
    return -1;
  }

  private static bitsToNumber(bits: number[]): number {
    return bits.reduce((acc, bit) => (acc << 1) | bit, 0);
  }
}
```

---

## 付録B. チャネル性能参考値

| チャネル | 理論ビットレート | 「こんにちは」(15バイト)の送信時間 |
|----------|------------------|----------------------------------|
| 超音波 | ~9.3 bps | 約17秒 |
| 可聴音 | ~12.8 bps | 約12秒 |
| 画面明滅 | ~4.0 bps | 約40秒 |
| 色変調 | ~3.6 bps | 約45秒 |
| 空間グリッド | ~40 bps | 約4秒 |
| QR | バースト | 約3秒（表示時間固定） |

※ 送信時間にはプリアンブル・開始マーカー・チェックサム・パイロット・ギャップの時間を含む。

---

## 付録C. グリッドチャネル用フレーミング詳細

### C.1 フレーム構造

グリッドチャネルは他のチャネルと異なり、バイト単位のフレーミングを使用する。

```
[Pilot: 全白 800ms] → [Gap: 全黒 400ms] → [Data Frames] → [Checkerboard 500ms]

Data Frame構造:
  フレーム1: [データ長(1byte)][データ[0](1byte)]
  フレーム2: [データ[1](1byte)][データ[2](1byte)]
  ...
  フレームN: [データ[N-2](1byte)][チェックサム(1byte)]
  ※ 奇数バイトの場合は0x00パディング
```

### C.2 セル→ビットマッピング

```
セル配置:
  Row 0: [0][1][2][3]
  Row 1: [4][5][6][7]
  Row 2: [8][9][10][11]
  Row 3: [12][13][14][15]

High byte (セル0-7):
  bit7=セル0, bit6=セル1, ..., bit0=セル7

Low byte (セル8-15):
  bit7=セル8, bit6=セル9, ..., bit0=セル15
```

### C.3 チェッカーボードパターン

```
終了マーカー:
  [■][□][■][□]
  [□][■][□][■]
  [■][□][■][□]
  [□][■][□][■]

判定: (row + col) % 2 === 0 なら白、1 なら黒
75%以上の一致で終了と判定（環境ノイズ耐性）
```

---

## 付録D. 使用ブラウザAPI一覧

| API | 用途 |
|-----|------|
| Web Audio API（AudioContext, OscillatorNode, AnalyserNode） | 音声の生成・解析 |
| MediaDevices.getUserMedia({ audio }) | マイクアクセス |
| MediaDevices.getUserMedia({ video }) | カメラアクセス |
| Canvas 2D API | 映像の描画・ピクセル解析・信号の可視化 |
| requestAnimationFrame | 受信ポーリング・アニメーション |
| TextEncoder / TextDecoder | UTF-8のエンコード/デコード |
| performance.now() | 高精度タイミング管理 |
| crypto.randomUUID() | メッセージID生成 |

---

## 付録E. 用語集

| 用語 | 説明 |
|------|------|
| FSK (Frequency Shift Keying) | 周波数の切り替えでビットを表現する変調方式 |
| パイロット信号 | 通信の開始を受信側に知らせるための固定周波数/パターンの信号 |
| プリアンブル | データの直前に置かれるクロック同期用のビットパターン |
| チェックサム | データの誤りを検出するために付加される検証値 |
| AnalyserNode | Web Audio APIのノードで、音声信号のFFT解析を行う |
| FFT (Fast Fourier Transform) | 時間領域の信号を周波数領域に変換する高速アルゴリズム |
| BitReceiver | 本アプリで定義するビット受信の汎用ステートマシンクラス |
| ガード区間 | ビット間の干渉を防ぐための短い無信号期間 |
| キャリブレーション | 受信開始時に環境の基準値を測定し、閾値を動的に設定すること |
