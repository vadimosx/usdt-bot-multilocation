import { neon } from "@neondatabase/serverless"

export const dynamic = "force-dynamic"

async function getOrders() {
  const sql = neon(process.env.DATABASE_URL!)

  const orders = await sql`
    SELECT 
      id,
      from_currency,
      to_currency,
      amount,
      converted_amount,
      exchange_rate,
      client_contact,
      status,
      created_at
    FROM orders
    ORDER BY created_at DESC
    LIMIT 50
  `

  return orders
}

export default async function OrdersPage() {
  const orders = await getOrders()

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-8 text-3xl font-bold">Заявки из базы данных</h1>

        <div className="rounded-lg border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="p-4 text-left font-medium">ID</th>
                  <th className="p-4 text-left font-medium">Дата</th>
                  <th className="p-4 text-left font-medium">Направление</th>
                  <th className="p-4 text-left font-medium">Сумма отдаю</th>
                  <th className="p-4 text-left font-medium">Сумма получаю</th>
                  <th className="p-4 text-left font-medium">Курс</th>
                  <th className="p-4 text-left font-medium">Банки</th>
                  <th className="p-4 text-left font-medium">Статус</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      Заявок пока нет
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr key={order.id} className="border-b last:border-0">
                      <td className="p-4 font-mono text-sm">{order.id}</td>
                      <td className="p-4 text-sm">{new Date(order.created_at).toLocaleString("ru-RU")}</td>
                      <td className="p-4">
                        <span className="font-medium">
                          {order.from_currency} → {order.to_currency}
                        </span>
                      </td>
                      <td className="p-4 text-right font-mono">
                        {Number(order.amount).toFixed(2)} {order.from_currency}
                      </td>
                      <td className="p-4 text-right font-mono">
                        {Number(order.converted_amount).toFixed(2)} {order.to_currency}
                      </td>
                      <td className="p-4 text-right font-mono text-sm">{Number(order.exchange_rate).toFixed(4)}</td>
                      <td className="p-4 text-sm">{order.client_contact || "-"}</td>
                      <td className="p-4">
                        <span className="inline-flex rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 text-sm text-muted-foreground">Показано последних {orders.length} заявок</div>
      </div>
    </div>
  )
}
