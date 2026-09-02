const Quotation = require('../models/Quotation');
const generateNumber = require('../utils/generateNumber');

const calculateTotals = (items = []) => {
  let subtotal = 0;
  let taxTotal = 0;
  let discountTotal = 0;

  const normalized = items.map((item) => {
    const quantity = Number(item.quantity || 1);
    const unitPrice = Number(item.unitPrice || 0);
    const gross = quantity * unitPrice;
    const discount = gross * (Number(item.discountRate || 0) / 100);
    const taxable = gross - discount;
    const tax = taxable * (Number(item.taxRate || 0) / 100);

    subtotal += gross;
    discountTotal += discount;
    taxTotal += tax;

    return {
      ...item,
      quantity,
      unitPrice,
    };
  });

  return {
    items: normalized,
    subtotal,
    discountTotal,
    taxTotal,
    grandTotal: subtotal - discountTotal + taxTotal,
  };
};

const prepareQuotation = async (payload) => {
  const totals = calculateTotals(payload.items);
  return {
    ...payload,
    quotationNumber: payload.quotationNumber || await generateNumber('QUO'),
    ...totals,
  };
};

module.exports = { calculateTotals, prepareQuotation };
