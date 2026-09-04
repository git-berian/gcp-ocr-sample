# ADR-0015: Functions の入口を onRequest に一本化し、Web をローカル実行専用とする

## ステータス

提案

## コンテキスト

Functions は 3 つの抽出エンジン（Document AI / Gemini / Claude）に対して onCall / onRequest の 2 系統、計 6 関数を公開している（ADR-0002 / ADR-0010 / ADR-0012）。この 2 系統は #148 で「Hosting（Web）と外部サービスでアクセス元が異なるため、入り口を分離して適切な認証を適用する」という方針のもと分けられた。

しかし**分離後に認証が適用されたのは onRequest 側だけ**だった。onRequest は `FUNCTIONS_API_KEY` による Bearer 認証を持つ（#165 で未設定時のバイパスも修正済み）一方、onCall 側は分離されただけで呼び出し元の検証が入らず、関数名と Firebase 設定さえ分かれば誰でも直接呼び出せる状態が残った。#148 の宣言が片肺で終わっている。

これが実害になるのは、対象の 3 関数がいずれも従量課金の外部 API を呼ぶためである。とくに Document AI Expense Parser は **$0.10/ドキュメント固定**（ADR-0010）で、呼び出し回数がそのまま課金額になる。

Web 側にある `PasswordGate`（#140）は保護にならない。クライアント側で state を切り替えるだけで、値はバンドルに含まれ、そもそも Functions を直接叩く経路には一切関与しない。#140 自身が「本格的な認証（Firebase Authentication 等）の導入前の簡易的なアクセス制限」と位置づけていた。

当初はこの前提のまま「onCall に呼び出し元の認証を足す」方向で検討したが、検討の過程で前提そのものが誤っていたことが分かった。**onCall と Web は API の動作確認のために用意されたものであり、本番運用で必要なのは onRequest だけである。** つまり守るべき公開エンドポイントだと思っていたものが、そもそも公開する必要のないものだった。

さらに、現在の構成には動作確認としての欠陥がある。**Web で確認しているのは onCall 経路だが、本番で動くのは onRequest 経路**であり、確認していない経路を本番で動かしている。観測性も揃っておらず、onRequest にある PII 安全ログ（`[AI] receipt extracted`）は onCall 側に存在しない。

## 決定

**onCall を廃止し、Functions の入口を onRequest に一本化する。Web は Hosting にデプロイせず、ローカル実行専用とする。**

| 対象                                                                                          | 扱い                                                            |
| --------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| onCall 3 本（`parseDocumentCall` / `parseDocumentGeminiCall` / `parseDocumentClaudeCall`）    | **削除**（ローカルにも残さない）                                |
| Web（`packages/web`）                                                                         | **ローカル実行専用**。dev サーバー + Firebase Emulator で動かす |
| onRequest 3 本（`parseDocumentHttp` / `parseDocumentGeminiHttp` / `parseDocumentClaudeHttp`） | **デプロイ対象。これのみが本番で動く**                          |

Web からの呼び出しは次の形にする。

- ブラウザは同一オリジンの `/api/<onRequest 関数名>` を `fetch` で叩く
- **Vite の dev サーバーが `server.proxy` でエミュレータへ転送する際に `Authorization: Bearer` を付与する**
  - Functions エミュレータの待ち受けは `/<project>/<region>/<関数名>` の形のため、proxy に rewrite が要る
  - 転送先は compose に定義済みの `API_PROXY_TARGET`（`http://host.docker.internal:8080`）を使う。現在は未使用のまま置かれており、本構成の下地になる
  - `src/api/engines.ts` が持つ `callableName`（`parseDocumentCall` 等）は onRequest 名（`parseDocumentHttp` 等）へ差し替える
- `FUNCTIONS_API_KEY` は `.env.local` に置き、**バンドルには入れない**（`VITE_` 接頭辞を付けない）
  - Vite は `VITE_` 接頭辞の無い変数を `process.env` に載せないため、`vite.config.ts` で `loadEnv(mode, process.cwd(), "")` を明示的に呼んで読む

これに伴い、Hosting へのデプロイと Firebase SDK を前提とした仕組みを撤去する。対象は次のとおり。

- `packages/web/src/api/firebase.ts`（`initializeApp` / `connectFunctionsEmulator`）と `packages/web` の `firebase` 依存
- `VITE_FIREBASE_*` 6 変数と `VITE_APP_PASSWORD`、およびそれらを持つ `.env.example` / `.env.development` / `.env.staging` / `.env.production`
- `PasswordGate` 一式と `App.tsx` の `APP_PASSWORD` 分岐
- `scripts/build-for-deploy.mjs` / `scripts/deploy-guard.mjs`
- `firebase.json` の `hosting` セクションと **`emulators.hosting`**（`hosting` だけ消すと、`--only functions` を付けない `firebase emulators:start` が public 未定義のまま起動しようとする）

本 ADR は方針の意思決定を扱い、コード実装は別 PR で行う。

### 既存 ADR との関係

- **ADR-0007（Firebase Hosting の採用）を supersede する。** Web を Hosting にデプロイしなくなるため、この決定は失効する。
- **ADR-0004（Web フロントエンドパッケージの新設）の「API クライアント設計」節全体を supersede する。** 同節が定める次の 4 点はいずれも失効する。
  - `src/api/firebase.ts` で `VITE_FIREBASE_*` を使って Firebase App + Functions を初期化する
  - `src/api/parse-document.ts` が `httpsCallable` で onCall を呼ぶ
  - ローカル開発時は `connectFunctionsEmulator` でエミュレータに接続する
  - 環境変数を `.env.development` / `.env.staging` / `.env.production` で環境ごとに管理する

  一方、React + Vite の技術選定、`packages/web` の配置、`@docai/functions` のコードに依存しないという方針は引き続き有効。境界は onCall プロトコルから **onRequest の HTTP インターフェース**に変わるが、「Functions のコードに依存せず、プロトコルを境界とする」という原則は保たれる。

- **ADR-0006（Firebase Functions への移行）は変更しない。** onRequest は ADR-0006 が当初採用した形そのものであり、本 ADR はそこへ戻す方向にあたる。

## 理由

- **動作確認の対象が本番経路と一致する。** これが最大の理由。入口が 1 つになれば、Web で確認したものがそのまま本番で動くものになる。onCall を残す限り、確認していない経路を本番で動かす状態は解消しない。
- **露出そのものが無くなる。** 呼び出し元を認証で絞るのではなく、ブラウザから叩ける入口を消す。認証機構を新たに実装せずに、コンテキストで述べた課金の露出が解消する。
- **変更が transport 層に閉じる。** onCall / onRequest はリクエスト（`{ content, mimeType }`）もレスポンス（`{ receipt }`）も同形であることを実測で確認済み。差分は認証ヘッダー・エラー表現（`HttpsError` か HTTP status + `{ error }`）・ログのみで、application 層以下には影響しない。
- **コードが減る。** onCall ハンドラー 3 本と単体・結合テストで 9 ファイル・約 650 行、加えて `PasswordGate` 一式・デプロイガード・`firebase` 依存が消える。同じ 3 エンジンに対してハンドラーを 2 系統持つ重複も解消する。
- **#148 が目指した非対称の解消を、認証を足すのではなく入口を 1 つにすることで達成する。** 認証方式が 1 つになるため、以後「どちらの入口にどの認証が要るか」を考える必要がなくなる。
- **秘密がバンドルに出ない。** dev サーバーの proxy で認証ヘッダーを付けるため、`FUNCTIONS_API_KEY` はブラウザに渡らない。`VITE_APP_PASSWORD` がバンドルに焼かれていた状態（#140 の既知の限界）は解消する。ただしこれは**秘密の露出についての主張のみ**であり、dev サーバー自体の到達範囲は別の論点として「受容リスク」に記録する。

### 検討した代替案

- **Firebase Authentication（Google サインイン）+ 許可リスト**: 呼び出し元を実際に限定でき、#140 が本命として名指ししていた方式。`PasswordGate` と `VITE_APP_PASSWORD` も廃止できる。しかし Web をデプロイしないなら不要であり、実装量に見合わない。却下。
  - 検討中に確認した事項として記録する: **Firebase ID トークンに Google の `hd`（hosted domain）クレームが載ることは確認できなかった。** `firebase-admin` の `DecodedIdToken` に該当フィールドが無く、Firebase 公式のクレーム一覧にも記載が無い。ただし `DecodedIdToken` はインデックスシグネチャを持つため、**型定義の不在は実トークンに載らないことの証明にはならない。実トークンでの確認は未実施**。ドメインで絞るなら `email` のサフィックス照合が確実な方法になる。将来この方式を再検討するときは、まず実トークンの中身を確認すること。
  - `beforeSignIn` によるブロッキング関数はサインイン自体を弾けるが、**Identity Platform へのアップグレードが必須**。無料枠内ではあるがプラットフォーム依存が増える。
- **Firebase App Check（reCAPTCHA v3 / Enterprise）**: 当初の検討の出発点だったが、**アプリの証明であって呼び出し元の認証ではない**。ページに誰でも到達できる以上、任意の訪問者が正規のトークンを取得できるため、課金の露出は残る。ページ外からのスクリプト直叩きは防げるが、本 ADR の構成では入口自体が消えるため不要。却下。
- **Firebase Auth の匿名認証**: 公開される `VITE_FIREBASE_API_KEY` だけで誰でもトークンを取得できるため、呼び出し元の限定にならない。却下。
- **IAP を Hosting に置く**: Firebase Hosting は IAP 非対応。加えて onCall は Hosting を経由せず Functions を直接呼ぶため、仮に置けても保護できない。却下。
- **onCall を残したままデプロイ対象から外す**（`firebase deploy --only` での明示指定 / `FUNCTIONS_EMULATOR` による条件付き export / codebase 分割）: 露出は止まるが、「デプロイしてはいけない関数」がリポジトリに残り続ける。`--only` は素の `firebase deploy` を打てば素通りし、条件付き export は CLI の関数検出時の挙動が未検証、codebase 分割は構成が重い。いずれも**動作確認の経路が本番と違うままである**という本質的な問題を解決しない。却下。
- **現状維持 + 課金上限のみ**（#269 のみ実施）: データを一切保存しない構成（`firebase.json` に Firestore / Storage は無く、永続化コードも存在しない）のため情報漏洩の経路はなく、上限さえあれば被害は有限に収まる。しかし第三者の文書が本プロジェクトの GCP・Anthropic API キーを経由して処理される状態が残る。課金上限自体は本 ADR と直交して有効なため #269 として並行させる。単独案としては却下。

## 影響

- **メリット**: 公開エンドポイントが onRequest 3 本のみになり、すべてが `FUNCTIONS_API_KEY` で認証される。動作確認が本番経路と一致する。コードと依存が減る。
- **デメリット**: Web を URL で共有できなくなる。動作確認には各自のローカル環境（Docker + エミュレータ + ADC 用のサービスアカウントキー）が必要になり、非エンジニアに見せる用途には使えなくなる。これは #140 が Hosting にデプロイした動機そのものを手放すことを意味する。
- **今後の制約**: Web の呼び出しが dev サーバーの proxy を前提とするため、**将来 Web を再びデプロイする場合は呼び出し元認証を含めて作り直しになる**（本 ADR の代替案に挙げた Firebase Authentication が第一候補になる）。
- デプロイ済みの onCall 3 関数は `firebase functions:delete` で削除する必要がある。
- **onCall の削除（9 ファイル・約 650 行）とは別に、Web 側に連動変更がある。** `tests/scripts/deploy-guard.test.ts`、`packages/web/vitest.config.ts` の `scripts` プロジェクト定義、root の `docker:web:test:scripts` スクリプトが同時に不要になる。`tests/integration/helpers/mock-firebase.ts` と `src/api/parse-document.test.ts` の `vi.mock("firebase/functions")` は `fetch` のモックへ作り直しになる。
- ルート `README.md` の `firebase.json # Firebase 設定（Functions + Hosting デプロイ）`、`packages/functions/README.md` のエンドポイント表、`packages/web/README.md` の環境変数表とデプロイ手順が変わる（#270）。

### 必須チェック観点

- **コスト**: 直接の増減は無い。onRequest の単価・呼び出し方は不変。間接的な効果として、認証されていない呼び出し経路が無くなることで想定外の課金経路が 1 つ減る。呼び出し回数の上限（`maxInstances` / 予算アラート）は本 ADR のスコープ外とし、#269 で扱う。
- **クォータ・レート制限**: 該当なし。呼び出す外部 API とその頻度は変わらない。
- **レイテンシー**: 本番経路（onRequest）は不変。ローカルの Web は dev サーバーの proxy を 1 段挟むが、同一ホスト内の転送であり実用上の影響は無い。
- **データレジデンシー・個人情報**: 該当なし。処理するデータ・送信先・リージョンはいずれも不変。副次的な改善として、onCall 側に無かった PII 安全ログ（値そのものを出さず抽出可否のみ記録する `[AI] receipt extracted`）が全経路に揃う。
- **コンプライアンス・セキュリティ**: 公開エンドポイントが 6 本から 3 本になり、残る 3 本はすべて `FUNCTIONS_API_KEY` による Bearer 認証を持つ。未認証で外部 API を呼べる経路が無くなる。`FUNCTIONS_API_KEY` は引き続き Secret Manager で管理する。ローカルの Web が使うキーは `.env.local` から dev サーバーが読み、バンドルには含めない。
- **受容リスク**:
  - **一方通行の変更**: Web を再デプロイする場合の作り直しコストを受容する。本番運用に Web が不要であるという前提に依存しており、この前提が変われば本 ADR の再検討が必要になる。
  - **#260 / #265 で整備したマルチ環境の準備（`.env.staging` / `.env.production` / `deploy-guard`）が不要になる**ことを受容する。Functions 側のデプロイ先切り替え（`.firebaserc` のエイリアス）は影響を受けない。
  - **`FUNCTIONS_API_KEY` が漏洩した場合、onRequest は無制限に呼べる**。本 ADR は呼び出し回数の上限を扱わない。天井の設定は #269 で別途判断する。
  - **ローカル dev サーバーの到達範囲**: `docker:web:dev` は `npm run dev -- --host`（コンテナ内で 0.0.0.0 にバインド）、compose は `ports: "5173:5173"`（ホストの全インターフェースに公開）のため、dev サーバーは同一 LAN から到達できる。proxy が `Authorization` を自動付与し `PasswordGate` も撤去されるため、**LAN 上からは認証を経ずに課金 API を叩ける**。これは本 ADR で新たに生じるものではなく（`PasswordGate` はクライアント側で state を切り替えるだけであり、現在も LAN からエミュレータ経由で実 API に到達できる）、公開エンドポイントが 6 本から 3 本に減る点ではむしろ改善だが、**ローカル側の入口としては残る**。絞るなら compose の公開を `127.0.0.1:5173:5173` に変更する。ホスト以外の端末（スマートフォン等）から dev サーバーを開けなくなるトレードオフがあるため、本 ADR では決めず実装 PR で判断する。
