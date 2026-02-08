const express = require('express');
const { Client, middleware } = require('@line/bot-sdk');
const dayjs = require('dayjs');
const { createClient } = require('@supabase/supabase-js');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new Client(config);

// เชื่อมต่อ Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// webhook
app.post('/webhook', middleware(config), async (req, res) => {
  const events = req.body.events;
  const results = await Promise.all(events.map(handleEvent));
  res.json(results);
});

// cron ping
app.get('/', (req, res) => {
  console.log('[cron] Ping received');
  res.send('OK');
});

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') return null;

  const msg = event.message.text.trim();

  if (msg.startsWith('ปรับราคา ')) {
    const itemName = msg.replace('ปรับราคา ', '').trim();
    // ตอนบันทึกลง DB ใช้ format นี้ถูกต้องแล้ว เพื่อให้ DB เข้าใจว่าเป็นวันที่
    const today = dayjs().format('YYYY-MM-DD'); 

    await supabase.from('price_updates').insert([{ item: itemName, date: today }]);

    const { data: rows, error } = await supabase
      .from('price_updates')
      .select('item, date') // *แก้ตรงนี้ถ้า field id ไม่ได้ถูก select มา แต่ตอน order ใช้ id
      .order('id', { ascending: false })
      .limit(10);

    if (error) {
      console.error(error); // เพิ่ม log เพื่อดู error ถ้ามี
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: 'เกิดข้อผิดพลาดในการดึงข้อมูล',
      });
    }

    if (!rows || rows.length === 0) {
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: 'ยังไม่มีรายการปรับราคาครับ',
      });
    }

    // --- จุดที่แก้ไข ---
    const list = rows
      .reverse()
      .map((r, i) => `${i + 1}. ${r.item} (${dayjs(r.date).format('DD-MM-YY')})`)
      .join('\n');
    // ----------------

    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: `บันทึกรายการแล้ว ✅\n\nรายการล่าสุด 10 รายการ:\n${list}`,
    });
  }

  return null;
}
app.listen(PORT, () => {
  console.log('LINE bot (Supabase) listening on port ' + PORT);
});
