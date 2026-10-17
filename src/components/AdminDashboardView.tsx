/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, PackageSearch, RefreshCw, Search } from 'lucide-react';
import { formatRupiah } from '../lib/formatters.ts';
import { OrderRecord } from '../types/commerce.ts';

interface AdminDashboardViewProps {
  onInspectOrder: (order: OrderRecord) => void;
}

const statusLabel: Record<string, string> = {
  PENDING_PAYMENT: 'Menunggu pembayaran',
  PAID: 'Sudah dibayar',
  PROCESSING: 'Diproses',
  SHIPPED: 'Dikirim',
  COMPLETED: 'Selesai',
  CANCELLED: 'Dibatalkan',
  FAILED: 'Gagal',
  REFUNDED: 'Dikembalikan',
};

const paymentLabel: Record<string, string> = {
  PENDING: 'Belum dibayar',
  PAID: 'Lunas',
  EXPIRED: 'Kedaluwarsa',
  FAILED: 'Gagal',
  REFUNDED: 'Dikembalikan',
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  onInspectOrder,
}) => {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('ALL');

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/orders/track');
      if (!response.ok) throw new Error('Daftar order tidak dapat dimuat.');
      const data = await response.json();
      setOrders(Array.isArray(data.orders) ? data.orders : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat memuat order.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  const filteredOrders = useMemo(() => {
    const search = query.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesSearch =
        !search ||
        order.orderNumber.toLowerCase().includes(search) ||
        order.customerName.toLowerCase().includes(search) ||
        order.customerPhone.includes(search);
      const matchesStatus = filter === 'ALL' || order.status === filter;
      return matchesSearch && matchesStatus;
    });
  }, [filter, orders, query]);

  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-7">
        <div>
          <p className="text-sm font-semibold text-[#0DA487]">ADMIN TOKO</p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#072B2D] mt-1">
            Daftar Order
          </h1>
          <p className="text-sm text-slate-500 mt-1">Kelola dan lihat pesanan terbaru.</p>
        </div>
        <button
          type="button"
          onClick={() => void fetchOrders()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 cursor-pointer"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Muat ulang
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_220px] gap-3">
          <label className="relative block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari nomor order, nama, atau telepon"
              aria-label="Cari order"
              className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#0DA487]"
            />
          </label>
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            aria-label="Filter status order"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#0DA487]"
          >
            <option value="ALL">Semua status</option>
            {Object.entries(statusLabel).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-4 border-b border-slate-100">
          <h2 className="font-bold text-[#072B2D]">Semua Pesanan</h2>
          <span className="text-sm text-slate-500">{filteredOrders.length} order</span>
        </div>

        {error ? (
          <div className="p-8 text-center">
            <AlertCircle className="h-6 w-6 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-slate-600">{error}</p>
            <button type="button" onClick={() => void fetchOrders()} className="mt-3 text-sm font-semibold text-[#0DA487] cursor-pointer">
              Coba lagi
            </button>
          </div>
        ) : loading ? (
          <p className="p-8 text-center text-sm text-slate-500">Memuat order...</p>
        ) : filteredOrders.length === 0 ? (
          <div className="p-10 text-center">
            <PackageSearch className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">Order tidak ditemukan</p>
            <p className="text-sm text-slate-500 mt-1">Coba ubah pencarian atau filter status.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredOrders.map((order) => (
              <button
                key={order.orderNumber}
                type="button"
                onClick={() => onInspectOrder(order)}
                className="w-full text-left px-4 sm:px-5 py-4 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-[#008B94] font-mono-tabular">{order.orderNumber}</p>
                    <p className="text-sm font-semibold text-slate-800 mt-1">{order.customerName}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {order.customerPhone} · {formatDate(order.createdAt)}
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <p className="font-bold text-slate-900">{formatRupiah(order.total)}</p>
                    <div className="flex sm:justify-end flex-wrap gap-1.5 mt-1.5">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                        {statusLabel[order.status] || order.status}
                      </span>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${order.paymentStatus === 'PAID' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                        {paymentLabel[order.paymentStatus] || order.paymentStatus}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-3">
                  {order.items.map((item) => `${item.productName} × ${item.qty}`).join(' · ')}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
