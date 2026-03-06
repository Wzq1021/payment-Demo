const axios = require('axios');
const crypto = require('crypto');

// LinkPay Configuration
const keyLinkPay = 'd5e2c210d2114b1993ee68244ed88fce';

// 生成签名
function generateSignature(method, urlPath, dateTime, key, msgID, bodyString) {
  const stringToSign = [method, urlPath, dateTime, key, msgID, bodyString].join('\n');
  return crypto.createHash('sha256').update(stringToSign).digest('hex');
}

// 模拟webhook请求
async function testWebhook() {
  const dateTime = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  const msgID = crypto.randomUUID().replace(/-/g, '').slice(0, 32);
  
  const body = {
    eventCode: 'LinkPay',
    merchantOrderInfo: {
      merchantOrderID: 'DEMO_1234567890',
      status: 'Paid'
    },
    transactionInfo: {
      status: 'Captured',
      transAmount: {
        value: '100.00'
      },
      merchantTransInfo: {
        merchantTransID: 'TRANS_1234567890',
        merchantTransTime: dateTime
      }
    },
    result: {
      code: 'S0000',
      message: 'Success'
    },
    paymentMethod: {
      token: {
        value: 'test_token_123456'
      },
      card: {
        paymentBrand: 'VISA',
        last4: '1234'
      }
    },
    userInfo: {
      reference: 'test1'
    }
  };
  
  const bodyString = JSON.stringify(body);
  const signature = generateSignature('POST', '/linkpay/webhook', dateTime, keyLinkPay, msgID, bodyString);
  
  try {
    const response = await axios.post('http://localhost:3000/linkpay/webhook', body, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': signature,
        'DateTime': dateTime,
        'MsgID': msgID,
        'SignType': 'SHA256'
      }
    });
    
    console.log('Webhook response:', response.status, response.data);
    
    // 检查token是否保存成功
    const tokenResponse = await axios.get('http://localhost:3000/subscription/tokens/test1');
    console.log('Token check response:', tokenResponse.data);
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.status, error.response.data);
    }
  }
}

testWebhook();