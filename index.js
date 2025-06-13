const express = require('express');
const { Client, middleware } = require('@line/bot-sdk');
const fs = require('fs');
const dayjs = require('dayjs');

const app = express();

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new Client(config);
const PORT = process.env.PORT || 3000;

const DB_FILE = './data.json';

const loadData = () => fs.existsSync(DB_FILE) ? JSON.parse(fs.readFileSync(DB_FILE)) : [];
const saveData = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

app.post('/webhook', middleware(config), async (req, res) => {
  const events = req.body.events;
  const results = await Promise.all(events.map(handleEvent));
  res.json(results);
});

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') return null;

  const msg = event.message.text;
  const data = loadData();
  const today = dayjs();

  if (msg.startsWith('ปรับราคา ')) {
    const itemName = msg.replace('ปรับราคา ', '').trim();

    data.push({ item: itemName, date: today.format('YYYY-MM-DD') });
    saveData(data);

    const last10 = data.slice(-10).map((d, i) => `${i + 1}. ${d.item} (${d.date})`).join('\n');

    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: `บันทึกรายการแล้ว ✅\n\nรายการล่าสุด 10 รายการ:\n${last10}`,
    });
  }

  return null;
}

app.listen(PORT, () => {
  console.log(`LINE bot listening on http://localhost:${PORT}`);
});