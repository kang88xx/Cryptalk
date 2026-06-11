"use client";

import { useRef, useState, useTransition } from "react";
import { addPortfolioItem } from "@/lib/actions";

const SYMBOLS = ["BTC", "ETH", "XRP", "SOL", "TRX"];

export default function PortfolioForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [quantity, setQuantity] = useState("");
  const [buyPrice, setBuyPrice] = useState("");

  const qty = parseFloat(quantity);
  const price = parseFloat(buyPrice);
  const total = Number.isFinite(qty) && Number.isFinite(price) && qty > 0 && price > 0 ? qty * price : null;

  return (
    <form
      ref={formRef}
      action={(formData) => {
        startTransition(async () => {
          await addPortfolioItem(formData);
          formRef.current?.reset();
          setQuantity("");
          setBuyPrice("");
        });
      }}
      className="flex flex-wrap items-end gap-3"
    >
      <label className="flex flex-col gap-1 text-xs text-ink-500">
        코인
        <select
          name="symbol"
          className="border border-navy-300 bg-white px-3 py-2 text-sm text-ink-900 focus:border-navy-700 focus:outline-none"
        >
          {SYMBOLS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-ink-500">
        수량
        <input
          name="quantity"
          type="number"
          step="any"
          min="0"
          required
          placeholder="0.5"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="w-32 border border-navy-300 bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-navy-300 focus:border-navy-700 focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-ink-500">
        매수 단가 (원)
        <input
          name="buyPrice"
          type="number"
          step="any"
          min="0"
          required
          placeholder="93000000"
          value={buyPrice}
          onChange={(e) => setBuyPrice(e.target.value)}
          className="w-40 border border-navy-300 bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-navy-300 focus:border-navy-700 focus:outline-none"
        />
      </label>
      <div className="flex flex-col gap-1 text-xs text-ink-500">
        총 매수금액
        <span className="px-1 py-2 text-sm font-semibold font-mono text-navy-900">
          {total != null ? `${total.toLocaleString("ko-KR", { maximumFractionDigits: 0 })}원` : "-"}
        </span>
      </div>
      <button
        disabled={pending}
        className="bg-amber-500 px-5 py-2 text-sm font-semibold text-navy-950 hover:bg-amber-400 disabled:opacity-50"
      >
        {pending ? "추가 중..." : "추가"}
      </button>
    </form>
  );
}
