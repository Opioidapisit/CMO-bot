# LINE Price Bot

## วิธีใช้
1. สร้างไฟล์ `.env` แล้วใส่:
```
LINE_CHANNEL_ACCESS_TOKEN=your_token
LINE_CHANNEL_SECRET=your_secret
```

2. ติดตั้ง dependency
```
npm install
```

3. รันบอท
```
node index.js
```

4. เปิด webhook ด้วย ngrok:
```
npx ngrok http 3000
```

5. นำ URL ไปตั้งที่ LINE Developer Console > Webhook URL

## การใช้งาน
ส่งข้อความใน LINE:
```
ปรับราคา ข้าวสาร
```

บอทจะตอบกลับพร้อมแสดงรายการล่าสุด 10 รายการ