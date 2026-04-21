const axios = require('axios');

async function testWebhook() {
  const dateTime = new Date().toISOString();
  
  const body = {
    eventCode: 'LinkPay',
    merchantOrderInfo: {
      merchantOrderID: 'DEMO_TEST_' + Date.now(),
      status: 'Paid'
    },
    transactionInfo: {
      status: 'Captured',
      transAmount: {
        value: '100.00'
      },
      merchantTransInfo: {
        merchantTransID: 'TRANS_TEST_' + Date.now(),
        merchantTransTime: dateTime
      }
    },
    result: {
      code: 'S0000',
      message: 'Success'
    },
    paymentMethod: {
      token: {
        value: 'test_token_test3'
      },
      card: {
        paymentBrand: 'VISA',
        last4: '4321'
      }
    },
    userInfo: {
      reference: 'test3'
    }
  };
  
  try {
    const response = await axios.post('https://rickdemo.vercel.app/linkpay/webhook', body, {
      headers: {
        'content-type': 'application/json',
        'authorization': 'd5e2c210d2114b1993ee68244ed88fce',
        'datetime': dateTime,
        'signtype': 'Key-based'
      }
    });
    
    console.log('Webhook response:', response.status, response.data);
    
    // 检查 token 是否保存成功
    const tokenResponse = await axios.get('https://rickdemo.vercel.app/subscription/tokens/test3');
    console.log('Token check response:', tokenResponse.data);
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.status, error.response.data);
    }
  }
}

testWebhook();