const axios = require('axios');

async function checkPaymentStatus(orderId) {
  try {
    console.log(`查询订单状态: ${orderId}`);
    const response = await axios.get(`https://rickdemo.vercel.app/linkpay/check-payment/${orderId}`);
    console.log('订单状态:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('错误:', error.message);
    if (error.response) {
      console.error('响应:', error.response.status, error.response.data);
    }
  }
}

// 从命令行参数获取订单ID
const orderId = process.argv[2];
if (orderId) {
  checkPaymentStatus(orderId);
} else {
  console.log('请提供订单ID，例如: node check-payment-status.js DEMO_1773034859618');
}