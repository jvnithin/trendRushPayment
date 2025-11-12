const express = require('express');
const { body, validationResult } = require('express-validator');
const Payment = require('../models/Payment');
const Order = require('../models/Order');
const paymentService = require('../services/paymentService');
const gstService = require('../services/gstService');

const router = express.Router();

// Validation middleware for Indian payments
const validateIndianPayment = [
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('currency').equals('INR').withMessage('Currency must be INR for Indian payments'),
  body('paymentMethod').isIn(['upi', 'card', 'netbanking', 'wallet', 'cash_on_delivery']).withMessage('Invalid payment method'),
  body('orderId').notEmpty().withMessage('Order ID is required'),
  body('userId').notEmpty().withMessage('User ID is required'),
  body('customerPhone').isMobilePhone('en-IN').withMessage('Valid Indian mobile number required'),
  body('billingAddress.state').notEmpty().withMessage('Billing state is required'),
  body('shippingAddress.state').notEmpty().withMessage('Shipping state is required')
];

// Get supported payment methods for India
router.get('/methods', (req, res) => {
  try {
    const methods = paymentService.getSupportedPaymentMethods();
    res.json({
      success: true,
      data: methods,
      country: 'India',
      currency: 'INR'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment methods',
      error: error.message
    });
  }
});

// Create payment
// router.post('/create', validateIndianPayment, async (req, res) => {
//   try {
//     console.log("started paymebt1")
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return res.status(400).json({
//         success: false,
//         message: 'Validation failed',
//         errors: errors.array()
//       });
//     }
//         console.log("started paymebt1")

//     const { 
//       amount, 
//       currency, 
//       paymentMethod, 
//       orderId, 
//       userId, 
//       customerPhone,
//       customerEmail,
//       customerName,
//       billingAddress,
//       shippingAddress,
//       items,
//       gstNumber
//     } = req.body;

//     // Check if payment already exists
//     const existingPayment = await Payment.findOne({ orderId });
//     if (existingPayment) {
//       return res.status(400).json({
//         success: false,
//         message: 'Payment already exists for this order'
//       });
//     }

//     // Calculate GST
//     const isInterState = billingAddress.state !== shippingAddress.state;
//     const gstDetails = gstService.calculateGST(amount, 18, isInterState);

//     let paymentResult;
//     let paymentProvider = 'razorpay';
//         console.log("started paymebt2")

//     switch (paymentMethod) {
//       case 'upi':
//         paymentResult = await paymentService.createUPIPayment(amount, currency, orderId, {
//           userId,
//           customerPhone,
//           customerEmail,
//           customerName
//         });
//         break;
//       case 'card':
//         paymentResult = await paymentService.createCardPayment(amount, currency, orderId, {
//           userId,
//           customerPhone,
//           customerEmail,
//           customerName
//         });
//         break;
//       case 'netbanking':
//         paymentResult = await paymentService.createNetBankingPayment(amount, currency, orderId, {
//           userId,
//           customerPhone,
//           customerEmail,
//           customerName
//         });
//         break;
//       case 'wallet':
//         paymentResult = await paymentService.createWalletPayment(amount, currency, orderId, {
//           userId,
//           customerPhone,
//           customerEmail,
//           customerName
//         });
//         break;
//       case 'cash_on_delivery':
//         paymentResult = await paymentService.createCashOnDeliveryPayment(amount, currency, orderId, {
//           userId,
//           customerPhone,
//           customerEmail,
//           customerName
//         });
//         paymentProvider = 'cod';
//         break;
//       default:
//         return res.status(400).json({
//           success: false,
//           message: 'Invalid payment method'
//         });
//     }
//         console.log("started paymebt3")

//     if (!paymentResult.success) {
//       return res.status(400).json({
//         success: false,
//         message: 'Payment creation failed',
//         error: paymentResult.error
//       });
//     }
//         console.log("started paymebt4")

//     // Create payment record
//     const payment = new Payment({
//       orderId,
//       userId,
//       amount,
//       currency,
//       paymentMethod,
//       paymentProvider,
//       status: 'pending',
//       paymentDetails: paymentMethod === 'cash_on_delivery' ? {
//         deliveryAddress: shippingAddress
//       } : {
//         razorpayOrderId: paymentResult.orderId
//       },
//       gstDetails: {
//         gstNumber: gstNumber || null,
//         gstRate: 18,
//         ...gstDetails
//       },
//       metadata: {
//         customerEmail,
//         customerPhone,
//         customerName,
//         items: items || [],
//         billingAddress,
//         shippingAddress
//       }
//     });

//     await payment.save();
//     console.log("paymnet done")
//     res.status(201).json({
//       success: true,
//       message: 'Payment created successfully',
//       data: {
//         paymentId: payment._id,
//         orderId: payment.orderId,
//         amount: payment.amount,
//         currency: payment.currency,
//         paymentMethod: payment.paymentMethod,
//         status: payment.status,
//         gstDetails: payment.gstDetails,
//         ...(paymentMethod !== 'cash_on_delivery' && { 
//           razorpayOrderId: paymentResult.orderId,
//           key: paymentResult.key 
//         }),
//         ...(paymentMethod === 'upi' && { upiApps: paymentResult.upiApps }),
//         ...(paymentMethod === 'cash_on_delivery' && { 
//           message: 'Order created for cash on delivery' 
//         })
//       }
//     });

//   } catch (error) {
//     console.error('Payment creation error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Internal server error',
//       error: error.message
//     });
//   }
// });
// router.post('/create', validateIndianPayment, async (req, res) => { ... })
// Replace your current handler with this one:

router.post('/create', validateIndianPayment, async (req, res) => {
  console.log('== /api/payments/create called ==');
  try {
    // Log raw incoming body for debugging
    console.log('Incoming body:', JSON.stringify(req.body, null, 2));

    // Validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.warn('[PAYMENTS] Validation FAILED:', errors.array());
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    // Destructure
    const {
      amount,
      currency,
      paymentMethod,
      orderId,
      userId,
      customerPhone,
      customerEmail,
      customerName,
      billingAddress,
      shippingAddress,
      items,
      gstNumber
    } = req.body;

    // Quick sanity checks & logs
    console.log('[PAYMENTS] Parsed fields: ',
      { amount, currency, paymentMethod, orderId, userId, customerPhone, customerEmail }
    );

    if (!orderId) {
      console.warn('[PAYMENTS] missing orderId');
      return res.status(400).json({ success: false, message: 'orderId is required' });
    }
    if (typeof amount !== 'number' && typeof amount !== 'string') {
      console.warn('[PAYMENTS] invalid amount type', typeof amount);
      return res.status(400).json({ success: false, message: 'amount must be number' });
    }

    // Normalize amount to number
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      console.warn('[PAYMENTS] invalid numericAmount:', numericAmount);
      return res.status(400).json({ success: false, message: 'amount must be a positive number' });
    }

    // Check existing payment (log result)
    const existingPayment = await Payment.findOne({ orderId }).lean();
    console.log('[PAYMENTS] existingPayment found?', !!existingPayment);
    if (existingPayment) {
      console.warn('[PAYMENTS] Payment already exists for orderId=', orderId);
      return res.status(400).json({
        success: false,
        message: 'Payment already exists for this order'
      });
    }

    // GST calculation log
    const isInterState = (billingAddress?.state ?? '') !== (shippingAddress?.state ?? '');
    let gstDetails;
    try {
      gstDetails = gstService.calculateGST(numericAmount, 18, isInterState);
      console.log('[PAYMENTS] gstDetails:', gstDetails);
    } catch (gstErr) {
      console.warn('[PAYMENTS] GST calculation error:', gstErr && gstErr.message);
      // proceed but capture gstDetails as null to avoid crashing
      gstDetails = null;
    }

    let paymentResult;
    let paymentProvider = 'razorpay';
    console.log('[PAYMENTS] calling paymentService for method:', paymentMethod);

    try {
      switch (paymentMethod) {
        case 'upi':
          paymentResult = await paymentService.createUPIPayment(numericAmount, currency, orderId, {
            userId,
            customerPhone,
            customerEmail,
            customerName
          });
          break;
        case 'card':
          paymentResult = await paymentService.createCardPayment(numericAmount, currency, orderId, {
            userId,
            customerPhone,
            customerEmail,
            customerName
          });
          break;
        case 'netbanking':
          paymentResult = await paymentService.createNetBankingPayment(numericAmount, currency, orderId, {
            userId,
            customerPhone,
            customerEmail,
            customerName
          });
          break;
        case 'wallet':
          paymentResult = await paymentService.createWalletPayment(numericAmount, currency, orderId, {
            userId,
            customerPhone,
            customerEmail,
            customerName
          });
          break;
        case 'cash_on_delivery':
        case 'cod':
          paymentResult = await paymentService.createCashOnDeliveryPayment(numericAmount, currency, orderId, {
            userId,
            customerPhone,
            customerEmail,
            customerName
          });
          paymentProvider = 'cod';
          break;
        default:
          console.warn('[PAYMENTS] Invalid payment method:', paymentMethod);
          return res.status(400).json({
            success: false,
            message: 'Invalid payment method',
            provided: paymentMethod
          });
      }
    } catch (svcErr) {
      console.error('[PAYMENTS] paymentService threw error:', svcErr && (svcErr.stack || svcErr.message || svcErr));
      return res.status(502).json({
        success: false,
        message: 'Payment provider/service error',
        error: svcErr && svcErr.message ? svcErr.message : String(svcErr)
      });
    }

    // Log paymentResult in detail
    console.log('[PAYMENTS] paymentResult:', JSON.stringify(paymentResult ?? {}, null, 2));

    if (!paymentResult || !paymentResult.success) {
      console.warn('[PAYMENTS] paymentResult indicates failure', paymentResult);
      return res.status(400).json({
        success: false,
        message: 'Payment creation failed at provider',
        error: paymentResult?.error ?? 'Unknown provider error',
        providerResponse: paymentResult
      });
    }

    // Compose Payment document
    const paymentDoc = {
      orderId,
      userId,
      amount: numericAmount,
      currency: currency ?? 'INR',
      paymentMethod,
      paymentProvider,
      status: 'pending',
      paymentDetails: (paymentMethod === 'cash_on_delivery' || paymentProvider === 'cod')
        ? { deliveryAddress: shippingAddress }
        : { razorpayOrderId: paymentResult.orderId ?? paymentResult.razorpayOrderId ?? null },
      gstDetails: {
        gstNumber: gstNumber || null,
        gstRate: 18,
        ...(gstDetails || {})
      },
      metadata: {
        customerEmail,
        customerPhone,
        customerName,
        items: items || [],
        billingAddress,
        shippingAddress
      }
    };

    console.log('[PAYMENTS] saving payment document:', JSON.stringify(paymentDoc, null, 2));

    const payment = new Payment(paymentDoc);

    try {
      await payment.save();
      console.log('[PAYMENTS] saved payment id=', payment._id);
    } catch (saveErr) {
      console.error('[PAYMENTS] Mongo save failed:', saveErr && saveErr.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to persist payment record',
        error: saveErr && saveErr.message
      });
    }

    // Return success with useful debugging info for the client
    const responseData = {
      paymentId: payment._id,
      orderId: payment.orderId,
      amount: payment.amount,
      currency: payment.currency,
      paymentMethod: payment.paymentMethod,
      status: payment.status,
      gstDetails: payment.gstDetails,
      // include provider metadata
      ...(paymentMethod !== 'cash_on_delivery' && {
        razorpayOrderId: paymentResult.orderId ?? paymentResult.razorpayOrderId,
        key: paymentResult.key ?? paymentResult.razorpayKey ?? process.env.RAZORPAY_KEY
      }),
      ...(paymentMethod === 'upi' && { upiApps: paymentResult.upiApps ?? null })
    };

    console.log('[PAYMENTS] respond 201 with data:', responseData);
    return res.status(201).json({
      success: true,
      message: 'Payment created successfully',
      data: responseData
    });

  } catch (error) {
    console.error('[PAYMENTS] Unexpected error:', error && (error.stack || error.message || error));
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error && error.message ? error.message : String(error)
    });
  }
});

// Confirm payment
router.post('/confirm', async (req, res) => {
  try {
    const { paymentId, paymentMethod, paymentData } = req.body;

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    let verificationResult;

    if (paymentMethod === 'cash_on_delivery') {
      verificationResult = { success: true, verified: true };
    } else {
      verificationResult = await paymentService.verifyRazorpayPayment(
        paymentData.razorpayOrderId,
        paymentData.razorpayPaymentId,
        paymentData.razorpaySignature
      );
    }

    if (!verificationResult.success || !verificationResult.verified) {
      payment.status = 'failed';
      await payment.save();
      
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed',
        error: verificationResult.error
      });
    }

    // Update payment status
    payment.status = 'completed';
    if (paymentMethod !== 'cash_on_delivery') {
      payment.paymentDetails.razorpayPaymentId = paymentData.razorpayPaymentId;
      payment.paymentDetails.razorpaySignature = paymentData.razorpaySignature;
      if (paymentMethod === 'upi') {
        payment.paymentDetails.upiTransactionId = paymentData.razorpayPaymentId;
      }
    }
    await payment.save();

    // Update order status
    await Order.findOneAndUpdate(
      { orderId: payment.orderId },
      { 
        paymentStatus: 'paid',
        status: 'confirmed'
      }
    );

    res.json({
      success: true,
      message: 'Payment confirmed successfully',
      data: {
        paymentId: payment._id,
        status: payment.status,
        orderId: payment.orderId,
        gstDetails: payment.gstDetails
      }
    });

  } catch (error) {
    console.error('Payment confirmation error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get payment status
router.get('/status/:paymentId', async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.paymentId);
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    res.json({
      success: true,
      data: {
        paymentId: payment._id,
        orderId: payment.orderId,
        amount: payment.amount,
        currency: payment.currency,
        paymentMethod: payment.paymentMethod,
        status: payment.status,
        gstDetails: payment.gstDetails,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt
      }
    });

  } catch (error) {
    console.error('Get payment status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Refund payment
router.post('/refund', async (req, res) => {
  try {
    const { paymentId, amount, reason } = req.body;

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    if (payment.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Only completed payments can be refunded'
      });
    }

    const refundAmount = amount || payment.amount;
    const refundResult = await paymentService.refundPayment(
      payment.paymentDetails.razorpayPaymentId,
      refundAmount,
      reason,
      payment.paymentProvider
    );

    if (!refundResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Refund failed',
        error: refundResult.error
      });
    }

    // Update payment status
    payment.status = 'refunded';
    payment.refundDetails = {
      refundId: refundResult.refundId,
      refundAmount: refundAmount,
      refundReason: reason,
      refundedAt: new Date(),
      refundStatus: 'processed'
    };
    await payment.save();

    res.json({
      success: true,
      message: 'Refund processed successfully',
      data: {
        refundId: refundResult.refundId,
        refundAmount: refundAmount
      }
    });

  } catch (error) {
    console.error('Refund error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;
