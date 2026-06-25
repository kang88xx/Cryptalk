// 닉네임 정책 상수/타입 — "use server"인 lib/actions.ts에서 분리.
// (서버 액션 파일은 async 함수만 export 가능하므로 상수·타입은 여기 둔다.)

// 가입 후 닉네임 변경 가능 횟수 (미확정 사용자의 최초 1회 설정은 횟수에서 제외)
export const NICK_MAX_CHANGES = 3;

export type NicknameResult = { ok: boolean; message: string; remaining?: number };
