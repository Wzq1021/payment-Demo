const axios = require('axios');

async function testFullFlow() {
  try {
    // 1. 创建支付链接
    console.log('1. 创建支付链接...');
    const createResponse = await axios.post('https://rickdemo.vercel.app/linkpay/create-payment', {
      amount: 100,
      userReference: 'test5',
      isSubscription: true
    });
    
    console.log('支付链接创建成功:', createResponse.data);
    
    // 2. 模拟 webhook
    console.log('\n2. 模拟 webhook...');
    const dateTime = new Date().toISOString();
    const webhookBody = {
      eventCode: 'LinkPay',
      merchantOrderInfo: {
        merchantOrderID: createResponse.data.orderId,
        status: 'Paid'
      },
      transactionInfo: {
        status: 'Captured',
        transAmount: {
          value: '100.00'
        },
        merchantTransInfo: {
          merchantTransID: 'TRANS_' + Date.now(),
          merchantTransTime: dateTime
        }
      },
      result: {
        code: 'S0000',
        message: 'Success'
      },
      paymentMethod: {
        token: {
          value: 'real_token_test5'
        },
        card: {
          paymentBrand: 'VISA',
          last4: '5555'
        }
      },
      userInfo: {
        reference: 'test5'
      }
    };
    
    const webhookResponse = await axios.post('https://rickdemo.vercel.app/linkpay/webhook', webhookBody, {
      headers: {
        'content-type': 'application/json',
        'authorization': 'd5e2c210d2114b1993ee68244ed88fce',
        'datetime': dateTime,
        'signtype': 'Key-based'
      }
    });
    
    console.log('Webhook 响应:', webhookResponse.status, webhookResponse.data);
    
    // 3. 检查 token 是否保存成功
    console.log('\n3. 检查 token...');
    const tokenResponse = await axios.get('https://rickdemo.vercel.app/subscription/tokens/test5');
    console.log('Token 检查结果:', tokenResponse.data);
    
  } catch (error) {
    console.error('错误:', error.message);
    if (error.response) {
      console.error('响应:', error.response.status, error.response.data);
    }
  }
}

testFullFlow();