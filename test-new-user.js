const axios = require('axios');

async function testNewUser() {
  try {
    // 1. 创建支付链接
    console.log('1. 创建支付链接...');
    const createResponse = await axios.post('https://rickdemo.vercel.app/linkpay/create-payment', {
      amount: 100,
      userReference: 'test6',
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
          value: 'real_token_test6'
        },
        card: {
          paymentBrand: 'VISA',
          last4: '6666'
        }
      },
      userInfo: {
        reference: 'test6'
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
    
    // 3. 检查 token_users 列表
    console.log('\n3. 检查 token_users 列表...');
    const tokenUsersResponse = await axios.get('https://rickdemo.vercel.app/debug/token-users');
    console.log('Token users:', tokenUsersResponse.data);
    
    // 4. 检查所有用户的 token
    console.log('\n4. 检查所有用户的 token...');
    const users = tokenUsersResponse.data.tokenUsers;
    for (const user of users) {
      const tokenResponse = await axios.get(`https://rickdemo.vercel.app/subscription/tokens/${user}`);
      console.log(`${user} token:`, tokenResponse.data.success ? '存在' : '不存在');
    }
    
  } catch (error) {
    console.error('错误:', error.message);
    if (error.response) {
      console.error('响应:', error.response.status, error.response.data);
    }
  }
}

testNewUser();