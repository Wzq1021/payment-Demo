const translations = {
  zh: {
    brand: 'LinkPay',
    welcome: '欢迎使用 LinkPay',
    brand_intro: '安全、快速、便捷的在线支付解决方案，随时为您服务。',
    payment_instruction: '请选择支付方式并点击立即支付，跳转到安全支付页面。',
    go_to_refund: '前往退款',
    go_to_payment_options: '返回支付选择',
    item: '商品',
    quantity: '数量',
    amount: '金额',
    total: '总计',
    create_payment: '创建支付',
    select_payment_method: '选择支付方式',
    pay_now: '立即支付',
    copy_card_info: '复制卡信息',
    copied: '已复制',
    payment_success: '支付成功',
    success_instruction: '感谢您的支付，请保存订单号以便查询。',
    success_message: '{orderId} 支付成功',
    copy: '复制订单号',
    new_payment: '重新支付',
    footer: '© 2025 Payment Solutions. 安全、快速的支付解决方案。',
    about_us: '关于我们',
    contact: '联系客服',
    order_id: '订单号',
    payment_method: '支付方式',
    payment_method_alipay: '支付宝',
    payment_method_visa: 'Visa',
    payment_time: '支付时间',
    refund_title: '退款申请',
    refund_instruction: '请输入订单号和退款金额以发起退款。',
    check_refund_instruction: '请输入交易号以查询退款状态。',
    refund_amount: '退款金额',
    submit_refund: '提交退款',
    check_refund_status: '查询退款状态',
    transaction_id: '交易号',
    check_status: '查询状态',
    refund_result: '',
    refund_success: '退款请求成功',
    refund_failed: '退款失败：{error}',
    check_refund_result: '',
    refund_status: '退款状态：{status}',
    trans_id: '交易号',
    refund_pending: '正在发起退款请求...',
    refund_exceed: '退款金额超过剩余余额',
    refund_invalid_status: '无效订单状态',
    refund_error: '发生错误，请查看控制台日志',
    check_refund_pending: '正在查询退款状态...',
    check_refund_failed: '查询失败，请查看控制台日志',
    modal_instruction: '您的退款已提交，请保存交易号。',
    close: '关闭',
    invalid_order_id: '订单号必须以 DEMO_ 开头',
    invalid_trans_id: '交易号必须以 REF_ 或 REFUND_ 开头',
    payment_failed: '支付失败',
    network_error: '网络错误，请稍后重试',
    payment_verifying: '正在验证支付结果，请等...',
    payment_incomplete: '支付未完成，请稍后查看订单状态',
    query_failed: '查询失败：{error}',
    unknown_error: '未知错误',
    missing_fields: '缺少订单号或金额',
    no_trans_id: '未收到退款交易号',
    missing_trans_id: '缺少交易号',
    query_success: '查询成功',
    unknown_status: '未知',
    select_payment_solution: '选择支付解决方案',
    linkpay: 'LinkPay',
    dropin: 'Dropin'
  },
  en: {
    brand: 'LinkPay',
    welcome: 'Welcome to LinkPay',
    brand_intro: 'Secure, fast, and convenient payment solutions at your service.',
    payment_instruction: 'Select a payment method and click Pay Now to proceed.',
    go_to_refund: 'Go to Refund',
    go_to_payment_options: 'Back to Payment Options',
    item: 'Item',
    quantity: 'Quantity',
    amount: 'Amount',
    total: 'Total',
    create_payment: 'Pay Now',
    select_payment_method: 'Select Payment Method',
    pay_now: 'Pay Now',
    copy_card_info: 'Copy Card Info',
    copied: 'Copied',
    payment_success: 'Payment Success',
    success_instruction: 'Thank you for your payment, please save the order ID for reference.',
    success_message: '{orderId} paid successfully',
    copy: 'Copy Order ID',
    new_payment: 'New Payment',
    footer: '© 2025 Payment Solutions. Secure and fast payment solutions.',
    about_us: 'About Us',
    contact: 'Contact Support',
    order_id: 'Order ID',
    payment_method: 'Payment Method',
    payment_method_alipay: 'Alipay',
    payment_method_visa: 'Visa',
    payment_time: 'Payment Time',
    refund_title: 'Refund Request',
    refund_instruction: 'Enter order ID and refund amount to initiate a refund.',
    check_refund_instruction: 'Enter transaction ID to check refund status.',
    refund_amount: 'Refund Amount',
    submit_refund: 'Submit Refund',
    check_refund_status: 'Check Refund Status',
    transaction_id: 'Transaction ID',
    check_status: 'Check Status',
    refund_result: '',
    refund_success: 'Refund request successful',
    refund_failed: 'Refund failed: {error}',
    check_refund_result: '',
    refund_status: 'Refund status: {status}',
    trans_id: 'Transaction ID',
    refund_pending: 'Initiating refund request...',
    refund_exceed: 'Refund amount exceeds remaining balance',
    refund_invalid_status: 'Invalid order status',
    refund_error: 'An error occurred, please check console logs',
    check_refund_pending: 'Checking refund status...',
    check_refund_failed: 'Query failed, please check console logs',
    modal_instruction: 'Your refund has been submitted, please save the transaction ID.',
    close: 'Close',
    invalid_order_id: 'Order ID must start with DEMO_',
    invalid_trans_id: 'Transaction ID must start with REF_ or REFUND_',
    payment_failed: 'Payment failed',
    network_error: 'Network error, please try again later',
    payment_verifying: 'Verifying payment result, please wait...',
    payment_incomplete: 'Payment not completed, please check order status later',
    query_failed: 'Query failed: {error}',
    unknown_error: 'Unknown error',
    missing_fields: 'Missing order ID or amount',
    no_trans_id: 'No refund transaction ID',
    missing_trans_id: 'Missing transaction ID',
    query_success: 'Query successful',
    unknown_status: 'Unknown',
    select_payment_solution: 'Select Payment Solution',
    linkpay: 'LinkPay',
    dropin: 'Dropin'
  }
};

function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

function setLanguage(lang) {
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    if (translations[lang][key]) {
      let text = translations[lang][key];
      if (key === 'success_message' && element.dataset.orderId) {
        text = text.replace('{orderId}', element.dataset.orderId);
      } else if (key === 'refund_result' || key === 'check_refund_result') {
        if (element.dataset.status) {
          text = translations[lang][element.dataset.status].replace('{status}', element.dataset.value || '');
        } else if (element.dataset.error) {
          text = translations[lang][element.dataset.error].replace('{error}', element.dataset.errorValue || '');
        }
      }
      element.textContent = text;
    }
  });

  const paymentMethodEl = document.getElementById('payment-method-display');
  if (paymentMethodEl) {
    const currentMethod = paymentMethodEl.textContent;
    const methodMap = {
      '支付宝': 'payment_method_alipay',
      'Visa': 'payment_method_visa',
      'Alipay': 'payment_method_alipay',
      'visa': 'payment_method_visa'
    };
    const translationKey = methodMap[currentMethod] || 'payment_method_' + currentMethod.toLowerCase();
    paymentMethodEl.textContent = translations[lang][translationKey] || currentMethod;
  }

  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  const section = document.querySelector('.section');
  if (section) {
    section.style.display = 'none';
    section.offsetHeight;
    section.style.display = 'flex';
  }
  localStorage.setItem('language', lang);
}

document.addEventListener('DOMContentLoaded', () => {
  const savedLang = localStorage.getItem('language') || 'zh';
  const langSwitch = document.getElementById('language-switch');
  if (langSwitch) {
    langSwitch.value = savedLang;
  }
  setLanguage(savedLang);
});

const langSwitch = document.getElementById('language-switch');
if (langSwitch) {
  langSwitch.addEventListener('change', debounce((e) => {
    setLanguage(e.target.value);
  }, 100));
}