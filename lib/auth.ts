import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// 구글 가입자 닉네임 자동 생성 (중복 시 숫자 접미사)
async function uniqueNickname(base: string): Promise<string> {
  const trimmed = base.replace(/\s+/g, "").slice(0, 10) || "구글유저";
  let nickname = trimmed;
  for (let i = 0; i < 10; i++) {
    const exists = await prisma.user.findUnique({ where: { nickname } });
    if (!exists) return nickname;
    nickname = `${trimmed.slice(0, 7)}${Math.floor(1000 + Math.random() * 9000)}`;
  }
  return `user${Date.now().toString(36)}`;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Google,
    Credentials({
      credentials: {
        email: { label: "이메일", type: "email" },
        password: { label: "비밀번호", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null; // 구글 전용 계정은 비밀번호 로그인 불가

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        return { id: user.id, email: user.email, name: user.nickname };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        const email = user.email?.toLowerCase();
        if (!email) return false;
        // 미검증 이메일로 기존 계정에 연결되는 것을 차단 (계정 탈취 방지)
        if (profile && profile.email_verified === false) return false;

        let dbUser = await prisma.user.findUnique({ where: { email } });
        if (!dbUser) {
          const nickname = await uniqueNickname(user.name ?? email.split("@")[0]);
          dbUser = await prisma.user.create({ data: { email, nickname } });
        }
        // JWT에 우리 DB의 사용자 ID/닉네임을 싣는다
        user.id = dbUser.id;
        user.name = dbUser.nickname;
      }
      return true;
    },
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user) session.user.id = token.id as string;
      return session;
    },
  },
});
