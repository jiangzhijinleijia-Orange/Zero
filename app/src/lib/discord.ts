import "server-only";

/**
 * Discord Webhook への通知(F-5-1)。
 * 通知は補助線であり状態の正は常にアプリ側(P-2)なので、失敗は握りつぶす。
 * DISCORD_WEBHOOK_URL 未設定なら何もしない(連携は任意)。
 */
export async function notifyDiscord(content: string): Promise<void> {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
  } catch {
    // 通知失敗でアプリの操作を失敗させない
  }
}
