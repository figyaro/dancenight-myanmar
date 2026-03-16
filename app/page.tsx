import Link from 'next/link';

export default function IndexPage() {
  return (
    <div className="bg-black min-h-screen text-white flex flex-col justify-center items-center px-6 relative overflow-hidden">
      {/* 背景の装飾 */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-pink-600/20 blur-[100px] rounded-full point-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-600/20 blur-[100px] rounded-full point-events-none" />

      {/* メインコンテンツ */}
      <div className="z-10 w-full max-w-sm flex flex-col items-center">
        {/* ロゴ・タイトルエリア */}
        <div className="mb-12 text-center">
          <div className="w-24 h-24 mx-auto flex items-center justify-center mb-6 drop-shadow-2xl hover:scale-105 transition-transform duration-500">
            <img src="/logoDN.svg" alt="Dance Together Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-rose-400 mb-3 tracking-tight">
            Dance Together
          </h1>
          <p className="text-zinc-400 text-sm font-medium tracking-wide">
            ミャンマー最大のナイトライフプラットフォーム
          </p>
        </div>

        {/* アクションボタン */}
        <div className="w-full flex flex-col gap-4">
          <Link
            href="/register"
            className="w-full bg-pink-600 hover:bg-pink-500 text-white font-bold py-4 rounded-xl text-center shadow-[0_0_20px_rgba(219,39,119,0.4)] transition-all duration-300 hover:scale-[1.02]"
          >
            新規登録する
          </Link>
          <Link
            href="/login"
            className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-4 rounded-xl text-center border border-zinc-700 transition-all duration-300 hover:scale-[1.02]"
          >
            ログイン
          </Link>
        </div>

        {/* ゲストとして続ける（デモ用） */}
        <div className="mt-8">
          <Link href="/home" className="text-zinc-500 text-sm hover:text-pink-400 transition-colors underline underline-offset-4">
            ゲストとして続ける
          </Link>
        </div>
      </div>
    </div>
  );
}