"use client";

import { useEffect, useState } from "react";

// 인앱 브라우저(카카오톡·네이버·라인·인스타·페북·안드로이드 웹뷰)에서는 구글 OAuth가
// "403 disallowed_useragent"로 차단된다(구글 "Use secure browsers" 정책).
// 감지되면 기본 브라우저(Chrome/Safari)로 다시 열도록 안내한다.
const IN_APP_RE = /KAKAOTALK|NAVER\(inapp|DaumApps|Line\/|Instagram|FBAN|FBAV|FB_IAB|Snapchat|; wv\)/i;

export default function InAppBrowserNotice() {
  const [ua, setUa] = useState<string | null>(null);

  useEffect(() => {
    // navigator는 클라이언트에서만 접근 가능 → 마운트 후 감지(하이드레이션 불일치 방지)
    if (IN_APP_RE.test(navigator.userAgent)) setUa(navigator.userAgent);
  }, []);

  if (!ua) return null;

  const isIos = /iphone|ipad|ipod/i.test(ua);

  function openExternal() {
    const url = window.location.href;
    const low = ua!.toLowerCase();
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

  return (
    <div className="mb-4 border border-amber-500 bg-amber-50 p-3 text-xs">
      <p className="font-semibold text-amber-900">⚠ 인앱 브라우저에서는 구글 로그인이 안 됩니다</p>
      <p className="mt-1 text-amber-800">
        카카오톡·네이버 등 앱 안의 브라우저는 구글 정책상 로그인이 차단됩니다. 아래 버튼으로
        기본 브라우저(Chrome/Safari)에서 열어주세요.
      </p>
      <button
        type="button"
        onClick={openExternal}
        className="mt-2 w-full bg-amber-500 py-2 font-semibold text-navy-950 hover:bg-amber-400"
      >
        외부 브라우저로 열기
      </button>
      {isIos && (
        <p className="mt-1.5 text-[11px] text-amber-700">
          iOS는 화면 우측 하단/상단 메뉴(···) → “기본 브라우저로 열기”를 눌러도 됩니다.
        </p>
      )}
    </div>
  );
}
