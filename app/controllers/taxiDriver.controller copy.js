// controllers/taxiDriver.controller.js

const db = require("../models");
const TaxiDriver = db.taxiDriver;
const axios = require("axios");
// require("dotenv").config();
const pool = require("../config/config.booking");

// Create new driver
exports.create_byAdmin = async (req, res) => {
  try {
    const taxi_id = `Ta-${String(Date.now()).slice(-6)}`;

    const { taxi_lpr, driver, line_name, line_user_id } = req.body;
    console.log("TaxiDriver Model: ", TaxiDriver);
    const newDriver = await TaxiDriver.create({
      taxi_id,
      taxi_lpr,
      driver,
      line_name,
      line_user_id,
    });

    res.status(201).send(newDriver);
  } catch (err) {
    console.error("🔥 Sequelize error: ", err);
    res.status(500).send({ message: err.message, error: err.errors });
  }
};

exports.create_byDriver = async (req, res) => {
  try {
    const taxi_id = `Ta-${String(Date.now()).slice(-6)}`;
    const { taxi_lpr, driver, phone, line_name, line_user_id } = req.body;

    // console.log("TaxiDriver line_user_id: ", line_user_id);

    // 🔍 ตรวจสอบว่ามี line_user_id นี้แล้วหรือยัง
    const existingDriver = await TaxiDriver.findOne({
      where: { line_user_id },
    });

    if (existingDriver) {
      // console.log`บัญชีนี้ลงทะเบียนแล้ว (line_user_id: ${line_user_id})`;
      return res.status(400).send({
        message: `บัญชีนี้ลงทะเบียนแล้ว (line_user_id: ${line_user_id})`,
      });
    }

    // ถ้ายังไม่มีให้สร้างใหม่
    const newDriver = await TaxiDriver.create({
      taxi_id,
      taxi_lpr,
      driver,
      phone,
      line_name,
      line_user_id,
    });

    res.status(201).send(newDriver);
  } catch (err) {
    console.error("🔥 Sequelize error: ", err);
    res.status(500).send({ message: err.message, error: err.errors });
  }
};

// exports.create_byDriver = async (req, res) => {
//   try {
//     const taxi_id = `Ta-${String(Date.now()).slice(-6)}`;
//     // console.log("LIFF URL being sent:", liffUrl);
//     const { taxi_lpr, driver, phone, line_name, line_user_id } = req.body;
//     const newDriver = await TaxiDriver.create({
//       taxi_id,
//       taxi_lpr,
//       driver,
//       phone,
//       line_name,
//       line_user_id,
//     });

//     res.status(201).send(newDriver);
//   } catch (err) {
//     console.error("🔥 Sequelize error: ", err);
//     res.status(500).send({ message: err.message, error: err.errors });
//   }
// };

// Get all drivers
exports.findAll = async (req, res) => {
  try {
    const drivers = await TaxiDriver.findAll();
    res.send(drivers);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

// Update driver by id

exports.update = async (req, res) => {
  try {
    const { taxi_id } = req.body;

    if (!taxi_id) {
      return res
        .status(400)
        .send({ message: "Missing taxi_id in request body." });
    }

    const [updated] = await TaxiDriver.update(req.body, {
      where: { taxi_id: taxi_id },
    });

    if (updated) {
      const updatedDriver = await TaxiDriver.findOne({
        where: { taxi_id: taxi_id },
      });
      return res.send(updatedDriver);
    }

    res.status(404).send({ message: "Driver not found" });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const { taxi_id } = req.body;

    if (!taxi_id) {
      return res
        .status(400)
        .send({ message: "Missing taxi_id in request body." });
    }

    const deleted = await TaxiDriver.destroy({
      where: { taxi_id: taxi_id },
    });

    if (deleted) {
      return res.send({
        message: `Driver with taxi_id ${taxi_id} deleted successfully.`,
      });
    }

    res.status(404).send({ message: "Driver not found." });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

// line
// ฟังก์ชันใหม่: ดึงข้อมูลโปรไฟล์ LINE จาก user ID
// รับ webhook จาก LINE Messaging API

exports.handleLineWebhook = async (req, res) => {
  try {
    const events = req.body.events || [];

    console.log("📨 events", events);

    for (const event of events) {
      const line_user_id = event.source.userId;

      // เช็คผู้ใช้ลงทะเบียนหรือยัง (ทำก่อน เพื่อใช้งานได้ทั้ง message และ postback)
      const driver = await TaxiDriver.findOne({ where: { line_user_id } });

      // กรณียังไม่ลงทะเบียน (ไม่ว่าจะส่ง message หรือ postback)
      if (!driver) {
        // ส่ง Flex message ชวนลงทะเบียน
        const LIFF_URL_USE = `${process.env.LIFF_URL}?line_user_id=${line_user_id}`;
        console.log("❌ ไม่พบ line_user_id นี้ในฐานข้อมูล");
        console.log("🔗 LIFF_URL_USE:", LIFF_URL_USE);

        await axios.post(
          "https://api.line.me/v2/bot/message/reply",
          {
            replyToken: event.replyToken,
            messages: [
              {
                type: "flex",
                altText: "กรุณาลงทะเบียนเป็นคนขับแท็กซี่",
                contents: {
                  type: "bubble",
                  size: "mega",
                  hero: {
                    type: "image",
                    url: "https://chs.westwind.ab.ca/uploads/1259/registrationicon.png",
                    size: "full",
                    aspectRatio: "20:13",
                    aspectMode: "cover",
                  },
                  body: {
                    type: "box",
                    layout: "vertical",
                    spacing: "md",
                    contents: [
                      {
                        type: "text",
                        text: "คุณยังไม่ได้ลงทะเบียน",
                        weight: "bold",
                        size: "lg",
                        wrap: true,
                      },
                      {
                        type: "text",
                        text: "กรุณากดปุ่มด้านล่างเพื่อไปยังหน้า LIFF App",
                        size: "sm",
                        color: "#666666",
                        wrap: true,
                      },
                    ],
                  },
                  footer: {
                    type: "box",
                    layout: "vertical",
                    spacing: "sm",
                    contents: [
                      {
                        type: "button",
                        style: "primary",
                        color: "#0F8B8D",
                        action: {
                          type: "uri",
                          label: "ลงทะเบียนตอนนี้",
                          uri: LIFF_URL_USE,
                        },
                      },
                    ],
                  },
                },
              },
            ],
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
              "Content-Type": "application/json",
            },
          }
        );

        continue; // ข้ามไปรอบถัดไปของ for
      }

      // กรณี event เป็น postback
      if (event.type === "postback") {
        const postbackData = event.postback?.data || "";
        console.log("📨 ได้รับ postback:", postbackData);

        if (postbackData.includes("action=confirm")) {
          const bookingIdMatch = postbackData.match(/bookingId=([^&]+)/);
          const bookingId = bookingIdMatch ? bookingIdMatch[1] : "ไม่ทราบ";

          console.log(
            `✅ ผู้ใช้ ${line_user_id} ยืนยันงาน Booking ID: ${bookingId}`
          );

          //  อัปเดตสถานะใน DB ด้วย bookingId
          // เอา line_user_id ไป find ใน table taxiDriver เพื่อดึง เลขทะเบียน
          // เอา เลขทะเบียนไป find ใน table HappyData field =Booking_id  ว่าอยู่ field ไหน =TAXI_lpr_go / TAXI_lpr_back
          // ถ้า  = TAXI_lpr_go ให้ update CONFIRM_go
          // ถ้า  = TAXI_lpr_back ให้ update CONFIRM_back

          try {
            //todo ---- update confirm
            // ดึงข้อมูล LPR
            const driver = await TaxiDriver.findOne({
              where: { line_user_id },
            });

            if (!driver) {
              console.log("❌ ไม่พบ line_user_id นี้ใน table taxiDriver");
              return;
            }

            const taxi_lpr = driver.taxi_lpr; // หรือ driver.plate_number แล้วแต่ชื่อจริงใน DB
            console.log("🚕 พบเลขทะเบียน taxi_lpr =", taxi_lpr);

            // เอา bookingId และ taxi_lpr find rows ใน HappyData
            const connection = await pool.getConnection();
            const [rows] = await connection.execute(
              `
              SELECT * FROM HappyData 
              WHERE Booking_ID = ? 
              AND (TAXI_lpr_go = ? OR TAXI_lpr_back = ?)
              `,
              [bookingId, taxi_lpr, taxi_lpr]
            );

            if (rows.length === 0) {
              console.log("❌ ไม่พบข้อมูลใน HappyData");
            } else {
              const row = rows[0];
              let confirmField = null;

              if (row.TAXI_lpr_go === taxi_lpr) {
                confirmField = "CONFIRM_go";
              } else if (row.TAXI_lpr_back === taxi_lpr) {
                confirmField = "CONFIRM_back";
              }

              if (confirmField) {
                console.log(`🔄 อัปเดตฟิลด์ ${confirmField} เป็น "ok"`);

                await connection.execute(
                  `UPDATE HappyData SET ${confirmField} = ? WHERE Booking_ID = ?`,
                  ["ok", bookingId]
                );

                console.log("✅ อัปเดตเรียบร้อย");
              } else {
                console.log("⚠️ ไม่พบว่า taxi_lpr ตรงกับ go หรือ back");
              }
            }

            // todo -- end
            // ตอบกลับข้อความขอบคุณ
            await axios.post(
              "https://api.line.me/v2/bot/message/reply",
              {
                replyToken: event.replyToken,
                messages: [
                  {
                    type: "text",
                    text: `ขอบคุณที่ยืนยันงาน Booking ID: ${bookingId} ค่ะ`,
                  },
                ],
              },
              {
                headers: {
                  Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
                  "Content-Type": "application/json",
                },
              }
            );
          } catch (error) {
            console.error(
              "❌ เกิดข้อผิดพลาดระหว่างอัปเดต CONFIRM:",
              error.message
            );
          }

          continue; // เสร็จแล้วข้ามไป
        }

        if (postbackData.includes("action=reject")) {
          const bookingIdMatch = postbackData.match(/bookingId=([^&]+)/);
          const bookingId = bookingIdMatch ? bookingIdMatch[1] : "ไม่ทราบ";

          console.log(
            `❌ ผู้ใช้ ${line_user_id} ปฏิเสธงาน Booking ID==>: ${bookingId}`
          );

          try {
            // ตอบกลับข้อความรับทราบ
            await axios.post(
              "https://api.line.me/v2/bot/message/reply",
              {
                replyToken: event.replyToken,
                messages: [
                  {
                    type: "text",
                    text: `รับทราบการปฏิเสธงาน Booking ID: ${bookingId} ค่ะ`,
                  },
                ],
              },
              {
                headers: {
                  Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
                  "Content-Type": "application/json",
                },
              }
            );
          } catch (error) {
            console.error(
              "❌ เกิดข้อผิดพลาดระหว่างอัปเดต CONFIRM:",
              error.message
            );
          }

          continue;
        }
      }

      // กรณี event เป็นข้อความ (message)
      if (event.type === "message" && event.message.type === "text") {
        const userText = (event.message.text || "").toLowerCase();

        if (userText.includes("ยืนยันงานแล้ว")) {
          console.log(
            `✅ ผู้ใช้ ${line_user_id} ส่งข้อความ====: ยืนยันงานแล้ว`
          );

          await axios.post(
            "https://api.line.me/v2/bot/message/reply",
            {
              replyToken: event.replyToken,
              messages: [{ type: "text", text: "ขอบคุณที่ยืนยันงานค่ะ" }],
            },
            {
              headers: {
                Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
                "Content-Type": "application/json",
              },
            }
          );

          continue;
        }

        if (userText.includes("ปฏิเสธงาน")) {
          console.log(`❌ ผู้ใช้ ${line_user_id} ส่งข้อความ=: ปฏิเสธงาน`);

          // console.log("📨 events", events[0].message.text);

          // TODO: อัปเดตสถานะปฏิเสธใน DB
          // confirm = "cancle"

          try {
            //Todo อัปเดตสถานะปฏิเสธใน DB start

            const userText = event.message.text || "";

            // ใช้ RegExp หา bookingId จากข้อความ
            const bookingIdMatch = userText.match(
              /Booking ID:\s*([a-zA-Z0-9]+)/
            );

            const booking_Id = bookingIdMatch ? bookingIdMatch[1] : null;

            if (booking_Id) {
              console.log("📦 ดึง booking_Id ได้:", booking_Id);
            } else {
              console.log("⚠️ ไม่พบ booking_Id ในข้อความนี้");
            }

            //===================

            // ดึงข้อมูล LPR
            const driver = await TaxiDriver.findOne({
              where: { line_user_id },
            });

            if (!driver) {
              console.log("❌ ไม่พบ line_user_id นี้ใน table taxiDriver");
              return;
            }

            const taxi_lpr = driver.taxi_lpr; // หรือ driver.plate_number แล้วแต่ชื่อจริงใน DB
            console.log("🚕 พบเลขทะเบียน taxi_lpr =", taxi_lpr);

            // เอา bookingId และ taxi_lpr find rows ใน HappyData
            const connection = await pool.getConnection();
            const [rows] = await connection.execute(
              `
              SELECT * FROM HappyData 
              WHERE Booking_ID = ? 
              AND (TAXI_lpr_go = ? OR TAXI_lpr_back = ?)
              `,
              [booking_Id, taxi_lpr, taxi_lpr]
            );

            if (rows.length === 0) {
              console.log("❌ ไม่พบข้อมูลใน HappyData");
            } else {
              const row = rows[0];
              let confirmField = null;

              if (row.TAXI_lpr_go === taxi_lpr) {
                confirmField = "CONFIRM_go";
              } else if (row.TAXI_lpr_back === taxi_lpr) {
                confirmField = "CONFIRM_back";
              }

              if (confirmField) {
                console.log(`🔄 อัปเดตฟิลด์ ${confirmField} เป็น "cancle"`);

                await connection.execute(
                  `UPDATE HappyData SET ${confirmField} = ? WHERE Booking_ID = ?`,
                  ["cancle", booking_Id]
                );

                console.log("✅ อัปเดตเรียบร้อย");
              } else {
                console.log("⚠️ ไม่พบว่า taxi_lpr ตรงกับ go หรือ back");
              }
            }

            // TODO: อัปเดตสถานะปฏิเสธใน DB --END
            await axios.post(
              "https://api.line.me/v2/bot/message/reply",
              {
                replyToken: event.replyToken,
                messages: [{ type: "text", text: "รับทราบการปฏิเสธงานค่ะ" }],
              },
              {
                headers: {
                  Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
                  "Content-Type": "application/json",
                },
              }
            );
          } catch (error) {
            console.error(
              "❌ เกิดข้อผิดพลาดระหว่างอัปเดต CONFIRM:",
              error.message
            );
          }

          continue;
        }
      }

      // กรณีอื่น ๆ ไม่ต้องตอบกลับอะไร
      console.log(`ℹ️ ไม่ได้ตอบกลับ event type: ${event.type}`);
    }

    return res.status(200).send("OK");
  } catch (err) {
    console.error("❌ Webhook Error:", err.message);
    return res.status(500).send({ message: "Webhook processing failed." });
  }
};
