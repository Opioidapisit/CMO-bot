const express = require('express');
const { Client, middleware } = require('@line/bot-sdk');
const dayjs = require('dayjs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new Client(config);

// สร้างหรือเชื่อมต่อฐานข้อมูล SQLite
const DB_PATH = path.resolve(__dirname, 'data.db');
const db = new sqlite3.Database(DB_PATH);

db.serialize(() => {
  db.run("CREATE TABLE IF NOT EXISTS price_updates (id INTEGER PRIMARY KEY AUTOINCREMENT, item TEXT, date TEXT)");
});

// Webhook endpoint
app.post('/webhook', middleware(config), async (req, res) => {
  const events = req.body.events;
  const results = await Promise.all(events.map(handleEvent));
  res.json(results);
});

// Handle incoming LINE messages
async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') return null;

  const msg = event.message.text.trim();

  if (msg.startsWith('ปรับราคา ')) {
    const itemName = msg.replace('ปรับราคา ', '').trim();
    const today = dayjs().format('YYYY-MM-DD');

    db.run("INSERT INTO price_updates (item, date) VALUES (?, ?)", [itemName, today]);

    return new Promise((resolve) => {
      db.all(
        "SELECT item, date FROM price_updates ORDER BY id DESC LIMIT 10",
        [],
        (err, rows) => {
          if (err) {
            return resolve(client.replyMessage(event.replyToken, {
              type: 'text',
              text: 'เกิดข้อผิดพลาดในการดึงข้อมูล',
            }));
          }

          if (rows.length === 0) {
            return resolve(client.replyMessage(event.replyToken, {
              type: 'text',
              text: 'ยังไม่มีรายการปรับราคาครับ',
            }));
          }

          const list = rows
            .reverse()
            .map((r, i) => `${i + 1}. ${r.item} (${r.date})`)
            .join('\n');

          return resolve(client.replyMessage(event.replyToken, {
            type: 'text',
            text: `บันทึกรายการแล้ว ✅\n\nรายการล่าสุด 10 รายการ:\n${list}`,
          }));
        }
      );
    });
  }

  return null;
}

app.listen(PORT, () => {
  console.log(`LINE bot (SQLite) listening at http://localhost:${PORT}`);
});