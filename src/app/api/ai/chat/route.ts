import { NextResponse } from 'next/server';
import { readDb } from '@/lib/db';

const DEMO_RESPONSES: Record<string, string> = {
  default: 'I\'m your AI assistant for ZCMS. I can help you with:\n\n• **Customer insights** — "Show me customers with high spending"\n• **Business metrics** — "What\'s our monthly recurring revenue?"\n• **Service analytics** — "Which services are most popular?"\n• **Invoice status** — "Show me overdue invoices"\n• **Ticket trends** — "How many open tickets do we have?"\n• **Expense analysis** — "What are our top expenses this month?"\n• **General help** — "How do I create an invoice?"\n\nTry asking me anything about your business data!',
  customers: 'Here\'s a summary of your customer base:\n\n• **Total customers**: {count}\n• **Active**: {active} ({activePct}%)\n• **Suspended**: {suspended}\n• **Total spending**: {totalSpending}\n• **Average per customer**: {avgSpending}\n\nYour top 3 customers by spending:\n{topCustomers}\n\nWould you like me to dive deeper into any specific customer?',
  revenue: 'Here\'s your revenue overview:\n\n• **Total invoices**: {totalInvoices}\n• **Paid**: {paid}\n• **Unpaid/Overdue**: {unpaid}\n• **Total collected**: {totalCollected}\n• **Outstanding**: {outstanding}\n\nYour monthly recurring revenue is trending well. Consider sending payment reminders to customers with outstanding balances.',
  tickets: 'Here\'s your ticket overview:\n\n• **Open**: {openTickets}\n• **In progress**: {inProgress}\n• **Resolved**: {resolved}\n• **Average response time**: ~{avgResponse}h\n\n{priorityTip}\n\nNeed me to suggest a reply for any specific ticket?',
  expenses: 'Here\'s your expense analysis:\n\n• **Total expenses**: {totalExpenses}\n• **Categories**: {categories}\n• **Highest expense**: {topExpense}\n• **Profit margin**: ~{margin}%\n\n{expenseTip}',
};

function pickDemoResponse(message: string, db: any): string {
  const settings = db.settings;
  const customers = db.customers || [];
  const invoices = db.invoices || [];
  const tickets = db.tickets || [];
  const expenses = db.expenses || [];
  const services = db.services || [];

  const msg = message.toLowerCase();

  if (msg.includes('customer') || msg.includes('client') || msg.includes('user')) {
    const active = customers.filter((c: any) => c.status === 'Active').length;
    const suspended = customers.filter((c: any) => c.status === 'Suspended').length;
    const sorted = [...customers].sort((a: any, b: any) => (b.totalSpending || 0) - (a.totalSpending || 0));
    const totalSpending = sorted.reduce((s: number, c: any) => s + (c.totalSpending || 0), 0);
    const top = sorted.slice(0, 3);

    return DEMO_RESPONSES.customers
      .replace('{count}', String(customers.length))
      .replace('{active}', String(active))
      .replace('{activePct}', customers.length ? Math.round(active / customers.length * 100).toString() : '0')
      .replace('{suspended}', String(suspended))
      .replace('{totalSpending}', totalSpending.toLocaleString())
      .replace('{avgSpending}', customers.length ? (totalSpending / customers.length).toLocaleString() : '0')
      .replace('{topCustomers}', top.length ? top.map((c: any, i: number) => `${i + 1}. **${c.name}** — $${(c.totalSpending || 0).toLocaleString()}`).join('\n') : 'No customers yet');
  }

  if (msg.includes('revenue') || msg.includes('mrr') || msg.includes('invoice') || msg.includes('paid') || msg.includes('money') || msg.includes('income')) {
    const paid = invoices.filter((i: any) => i.status === 'Paid').length;
    const unpaid = invoices.filter((i: any) => i.status === 'Pending' || i.status === 'Overdue').length;
    const totalCollected = invoices.filter((i: any) => i.status === 'Paid').reduce((s: number, i: any) => s + (i.total || 0), 0);
    const outstanding = invoices.filter((i: any) => i.status !== 'Paid').reduce((s: number, i: any) => s + (i.total || 0), 0);

    return DEMO_RESPONSES.revenue
      .replace('{totalInvoices}', String(invoices.length))
      .replace('{paid}', String(paid))
      .replace('{unpaid}', String(unpaid))
      .replace('{totalCollected}', totalCollected.toLocaleString())
      .replace('{outstanding}', outstanding.toLocaleString());
  }

  if (msg.includes('ticket') || msg.includes('support') || msg.includes('help desk')) {
    const open = tickets.filter((t: any) => t.status === 'Open').length;
    const progress = tickets.filter((t: any) => t.status === 'In Progress').length;
    const resolved = tickets.filter((t: any) => t.status === 'Resolved').length;
    const priorityTip = open > 5
      ? '⚠️ You have a high volume of open tickets. Consider prioritizing by urgency.'
      : '✅ Ticket volume looks manageable.';

    return DEMO_RESPONSES.tickets
      .replace('{openTickets}', String(open))
      .replace('{inProgress}', String(progress))
      .replace('{resolved}', String(resolved))
      .replace('{avgResponse}', String(Math.floor(Math.random() * 4) + 1))
      .replace('{priorityTip}', priorityTip);
  }

  if (msg.includes('expense') || msg.includes('spend') || msg.includes('cost') || msg.includes('profit')) {
    const total = expenses.reduce((s: number, e: any) => s + (e.amount || 0), 0);
    const cats = [...new Set(expenses.map((e: any) => e.category))].join(', ') || 'None';
    const sorted = [...expenses].sort((a: any, b: any) => (b.amount || 0) - (a.amount || 0));
    const top = sorted[0];
    const totalRevenue = invoices.filter((i: any) => i.status === 'Paid').reduce((s: number, i: any) => s + (i.total || 0), 0);
    const margin = totalRevenue ? Math.round((totalRevenue - total) / totalRevenue * 100) : 0;
    const tip = margin < 20
      ? '⚠️ Your profit margin is below 20%. Review expenses or adjust pricing.'
      : '✅ Your profit margin looks healthy.';

    return DEMO_RESPONSES.expenses
      .replace('{totalExpenses}', total.toLocaleString())
      .replace('{categories}', cats)
      .replace('{topExpense}', top ? `${top.category || 'Unknown'} — $${top.amount.toLocaleString()}` : 'N/A')
      .replace('{margin}', String(margin))
      .replace('{expenseTip}', tip);
  }

  if (msg.includes('service') || msg.includes('plan') || msg.includes('hosting')) {
    const byType: Record<string, number> = {};
    services.forEach((s: any) => { byType[s.type || 'Unknown'] = (byType[s.type || 'Unknown'] || 0) + 1; });
    const typeList = Object.entries(byType).map(([t, c]) => `• **${t}**: ${c}`).join('\n');
    return `Here's your service breakdown:\n\n${typeList || 'No services configured yet.'}\n\nTotal services: **${services.length}**`;
  }

  if (msg.includes('trend') || msg.includes('growth') || msg.includes('analytics') || msg.includes('overview') || msg.includes('dashboard') || msg.includes('summary')) {
    const revenue = invoices.filter((i: any) => i.status === 'Paid').reduce((s: number, i: any) => s + (i.total || 0), 0);
    const expenses_total = expenses.reduce((s: number, e: any) => s + (e.amount || 0), 0);
    return `📊 **Business Summary**

• **Revenue**: $${revenue.toLocaleString()}
• **Expenses**: $${expenses_total.toLocaleString()}
• **Profit**: $${(revenue - expenses_total).toLocaleString()}
• **Customers**: ${customers.length}
• **Services**: ${services.length}
• **Open Tickets**: ${tickets.filter((t: any) => t.status === 'Open').length}
• **Pending Invoices**: ${invoices.filter((i: any) => i.status !== 'Paid').length}

Would you like a detailed breakdown of any area?`;
  }

  return DEMO_RESPONSES.default;
}

export async function POST(request: Request) {
  try {
    const { message } = await request.json();
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const db = readDb();
    const aiConfig = db.settings?.ai;

    if (!aiConfig?.enabled) {
      return NextResponse.json({ reply: 'AI features are disabled. Enable them in Settings > AI Configuration.' });
    }

    if (aiConfig.provider === 'demo' || !aiConfig.apiKey) {
      const reply = pickDemoResponse(message, db);
      return NextResponse.json({ reply });
    }

    const base = (aiConfig.baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
    const openaiResponse = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aiConfig.apiKey}`,
      },
      body: JSON.stringify({
        model: aiConfig.model || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an AI assistant for ZCMS, a cloud management platform. You have access to business data.
Current stats: ${db.customers.length} customers, ${db.services.length} services, ${db.invoices.length} invoices, ${db.tickets.length} tickets, ${db.expenses.length} expenses.
Answer questions helpfully and concisely. Use markdown formatting.`,
          },
          { role: 'user', content: message },
        ],
        max_tokens: 500,
      }),
    });

    if (!openaiResponse.ok) {
      const errText = await openaiResponse.text();
      console.error('AI API error:', openaiResponse.status, errText);
      const reply = pickDemoResponse(message, db);
      return NextResponse.json({ reply: `⚠️ AI provider error (${openaiResponse.status}). Falling back to demo mode.\n\n${reply}` });
    }

    const data = await openaiResponse.json();
    const reply = data.choices?.[0]?.message?.content || 'No response generated.';
    return NextResponse.json({ reply });
  } catch (error: any) {
    console.error('AI chat error:', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
