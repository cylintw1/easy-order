// Cloudflare Worker：多人點餐系統後端
// 需要綁定一個 KV Namespace，變數名稱必須是 ORDERS

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS });
    }

    // 送出/更新 一個人的選擇
    if (url.pathname === "/submit" && request.method === "POST") {
      try {
        const body = await request.json();
        const name = (body.name || "").trim();
        if (!name) {
          return json({ error: "缺少姓名" }, 400);
        }
        const record = { choices: body.choices || {}, time: Date.now() };
        await env.ORDERS.put("order:" + name, JSON.stringify(record));
        return json({ ok: true });
      } catch (e) {
        return json({ error: "格式錯誤" }, 400);
      }
    }

    // 取得所有人的選擇
    if (url.pathname === "/all" && request.method === "GET") {
      const list = await env.ORDERS.list({ prefix: "order:" });
      const results = [];
      for (const key of list.keys) {
        const val = await env.ORDERS.get(key.name);
        if (val) {
          const parsed = JSON.parse(val);
          results.push({
            name: key.name.replace("order:", ""),
            choices: parsed.choices,
            time: parsed.time,
          });
        }
      }
      return json({ submissions: results });
    }

    // 清空全部（自己要用時再叫用，避免誤觸，故意不做按鈕串接）
    if (url.pathname === "/reset" && request.method === "POST") {
      const list = await env.ORDERS.list({ prefix: "order:" });
      for (const key of list.keys) {
        await env.ORDERS.delete(key.name);
      }
      return json({ ok: true });
    }

    return json({ error: "not found" }, 404);
  },
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}
