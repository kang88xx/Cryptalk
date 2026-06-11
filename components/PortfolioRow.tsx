"use client";

import { useState, useTransition } from "react";
import { updatePortfolioItem, deletePortfolioItem } from "@/lib/actions";
import { formatMoney, formatPercent } from "@/lib/format";

type Item = {
  id: number;
  symbol: string;
  quantity: number;
  buyPrice: number;
  currency: string;
};

const INPUT_CLASS =
  "w-full border border-navy-300 bg-white px-2 py-1 text-xs text-ink-900 focus:border-navy-700 focus:outline-none";

function pnlColor(n: number | null): string {
  if (n == null) return "text-ink-500";
  if (n > 0) return "text-red-600";
  if (n < 0) return "text-indigo-700";
  return "text-ink-500";
}

export default function PortfolioRow({
  item,
  current,
}: {
  item: Item;
  current: number | null; // 현재가 (item.currency 기준) — 미지원 종목은 null
}) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [symbol, setSymbol] = useState(item.symbol);
  const [quantity, setQuantity] = useState(String(item.quantity));
  const [buyPrice, setBuyPrice] = useState(String(item.buyPrice));
  const [currency, setCurrency] = useState(item.currency);

  const buyTotal = item.quantity * item.buyPrice;
  const curTotal = current != null ? item.quantity * current : null;
  const pnl = curTotal != null ? ((curTotal - buyTotal) / buyTotal) * 100 : null;

  const save = () => {
    const fd = new FormData();
    fd.set("symbol", symbol);
    fd.set("quantity", quantity);
    fd.set("buyPrice", buyPrice);
    fd.set("currency", currency);
    startTransition(async () => {
      await updatePortfolioItem(item.id, fd);
      setEditing(false);
    });
  };

  if (editing) {
    return (
      <tr className="border-b border-line bg-paper last:border-0">
        <td className="px-5 py-2">
          <div className="flex items-center gap-1">
            <input
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              maxLength={12}
              className={`w-20 uppercase ${INPUT_CLASS}`}
            />
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="border border-navy-300 bg-white px-1 py-1 text-xs text-ink-900 focus:outline-none"
            >
              <option value="KRW">원</option>
              <option value="USD">$</option>
            </select>
          </div>
        </td>
        <td className="px-2 py-2">
          <input
            type="number"
            step="any"
            min="0"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className={`text-right ${INPUT_CLASS}`}
          />
        </td>
        <td className="px-2 py-2">
          <input
            type="number"
            step="any"
            min="0"
            value={buyPrice}
            onChange={(e) => setBuyPrice(e.target.value)}
            className={`text-right ${INPUT_CLASS}`}
          />
        </td>
        <td colSpan={4} className="px-2 py-2 text-right text-xs text-ink-500">
          수정 후 저장을 누르세요
        </td>
        <td className="px-5 py-2 text-right whitespace-nowrap">
          <button
            disabled={pending}
            onClick={save}
            className="bg-navy-900 px-2 py-0.5 text-xs text-white hover:bg-navy-700 disabled:opacity-50"
          >
            {pending ? "저장 중" : "저장"}
          </button>
          <button
            disabled={pending}
            onClick={() => setEditing(false)}
            className="ml-1 border border-navy-300 px-2 py-0.5 text-xs text-ink-500 hover:border-navy-900"
          >
            취소
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-line last:border-0">
      <td className="px-5 py-2 font-semibold text-navy-900">
        {item.symbol}{" "}
        <span className="bg-paper2 px-1 font-mono text-[10px] font-normal text-navy-500">
          {item.currency === "USD" ? "USD" : "KRW"}
        </span>
      </td>
      <td className="px-2 py-2 text-right font-mono text-ink-900">
        {item.quantity.toLocaleString("ko-KR", { maximumFractionDigits: 8 })}
      </td>
      <td className="px-2 py-2 text-right font-mono text-ink-900">
        {formatMoney(item.buyPrice, item.currency)}
      </td>
      <td className="px-2 py-2 text-right font-mono text-ink-900">
        {formatMoney(buyTotal, item.currency)}
      </td>
      <td className="px-2 py-2 text-right font-mono text-ink-900">
        {current != null ? formatMoney(current, item.currency) : "–"}
      </td>
      <td className="px-2 py-2 text-right font-mono font-semibold text-navy-900">
        {curTotal != null ? formatMoney(curTotal, item.currency) : "–"}
      </td>
      <td className={`px-2 py-2 text-right font-mono font-semibold ${pnlColor(pnl)}`}>
        {formatPercent(pnl)}
      </td>
      <td className="px-5 py-2 text-right whitespace-nowrap">
        <button
          onClick={() => setEditing(true)}
          className="border border-navy-300 px-2 py-0.5 text-xs text-ink-500 hover:border-navy-900 hover:text-navy-900"
        >
          수정
        </button>
        <button
          disabled={pending}
          onClick={() => startTransition(() => deletePortfolioItem(item.id))}
          className="ml-1 border border-navy-300 px-2 py-0.5 text-xs text-ink-500 hover:border-red-600/60 hover:text-red-600 disabled:opacity-50"
        >
          삭제
        </button>
      </td>
    </tr>
  );
}
