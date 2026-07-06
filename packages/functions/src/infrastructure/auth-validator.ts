export interface AuthSuccess {
  ok: true;
}

export interface AuthError {
  ok: false;
  message: string;
}

export function validateApiKey(
  authorizationHeader: string | undefined,
  validApiKey: string,
): AuthSuccess | AuthError {
  if (!validApiKey) {
    return { ok: false, message: "API キーが設定されていません。" };
  }

  if (!authorizationHeader) {
    return { ok: false, message: "認証が必要です。" };
  }

  if (!authorizationHeader.startsWith("Bearer ")) {
    return {
      ok: false,
      message:
        "Authorization ヘッダーの形式が不正です。Bearer <FUNCTIONS_API_KEY> を使用してください。",
    };
  }

  const provided = authorizationHeader.slice("Bearer ".length);

  if (provided !== validApiKey) {
    return { ok: false, message: "無効な API キーです。" };
  }

  return { ok: true };
}
