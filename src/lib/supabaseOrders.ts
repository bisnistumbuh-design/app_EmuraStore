import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { OrderRecord } from '../types/commerce.ts';

let client: SupabaseClient | undefined;

function getClient(): SupabaseClient {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      'Supabase belum dikonfigurasi. Isi SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY di environment server.'
    );
  }

  client = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return client;
}

function throwIfError(error: { message: string } | null): void {
  if (error) throw new Error(`Supabase orders: ${error.message}`);
}

export async function createOrderRecord(order: OrderRecord): Promise<void> {
  const { error } = await getClient().from('orders').insert({
    id: order.id,
    order_number: order.orderNumber,
    customer_name: order.customerName,
    customer_phone: order.customerPhone,
    total: order.total,
    status: order.status,
    payment_status: order.paymentStatus,
    created_at: order.createdAt,
    updated_at: order.updatedAt,
    order_data: order,
  });
  throwIfError(error);
}

export async function saveOrderRecord(order: OrderRecord): Promise<void> {
  const { error } = await getClient()
    .from('orders')
    .upsert(
      {
        id: order.id,
        order_number: order.orderNumber,
        customer_name: order.customerName,
        customer_phone: order.customerPhone,
        total: order.total,
        status: order.status,
        payment_status: order.paymentStatus,
        created_at: order.createdAt,
        updated_at: order.updatedAt,
        order_data: order,
      },
      { onConflict: 'order_number' }
    );
  throwIfError(error);
}

export async function getOrderRecord(
  identifier: string
): Promise<OrderRecord | null> {
  const { data, error } = await getClient()
    .from('orders')
    .select('order_data')
    .or(`order_number.eq.${identifier},id.eq.${identifier}`)
    .maybeSingle();
  throwIfError(error);
  return (data?.order_data as OrderRecord | undefined) ?? null;
}

export async function listOrderRecords(): Promise<OrderRecord[]> {
  const { data, error } = await getClient()
    .from('orders')
    .select('order_data')
    .order('created_at', { ascending: false });
  throwIfError(error);
  return (data || []).map((row) => row.order_data as OrderRecord);
}
