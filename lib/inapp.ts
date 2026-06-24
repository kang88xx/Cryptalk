// 인앱 브라우저(웹뷰) 감지 + 외부 브라우저 열기 — 클라이언트 전용 유틸.
// 카카오톡·네이버 등 인앱 브라우저에서는 구글 OAuth가 403 disallowed_useragent로
// 차단되므로(구글 "Use secure browsers" 정책), 로그인 진입 전에 기본 브라우저로 전환한다.

export const IN_APP_RE = /KAKAOTALK|NAVER\(inapp|DaumApps|Line\/|Instagram|FBAN|FBAV|FB_IAB|Snapchat|; wv\)/i;

export function isInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return IN_APP_RE.test(navigator.userAgent);
}

// 현재 URL을 기본 브라우저(Chrome/Safari)에서 다시 연다. 앱별 전환 방식이 달라 분기한다.
export function openExternalBrowser(): void {
  if (typeof navigator === "undefined") return;
  const ua = navigator.userAgent;
  const low = ua.toLowerCase();
  const isIos = /iphone|ipad|ipod/i.test(ua);
  const url = window.location.href;

  // 카카오톡: 외부 브라우저 열기 전용 스킴
  if (low.includes("kakaotalk")) {
    window.location.href = "kakaotalk://web/openExternal?url=" + encodeURIComponent(url);
    return;
  }
  // 라인: openExternalBrowser=1 파라미터로 외부 브라우저 전환
  if (low.includes("line/")) {
    window.location.href = url + (url.includes("?") ? "&" : "?") + "openExternalBrowser=1";
    return;
  }
  // 안드로이드 웹뷰: Chrome 인텐트로 강제 전환
  if (!isIos) {
    const noScheme = url.replace(/^https?:\/\//, "");
    window.location.href = `intent://${noScheme}#Intent;scheme=https;package=com.android.chrome;end`;
    return;
  }
  // iOS 기타 인앱: 프로그램적 강제 불가 → 주소 복사 후 안내
  navigator.clipboard?.writeText(url).catch(() => {});
  alert("주소가 복사되었습니다. Safari 등 기본 브라우저에 붙여넣어 열어주세요.");
}
