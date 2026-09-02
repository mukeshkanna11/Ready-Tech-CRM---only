const Quotation = require('../models/Quotation');
const createCrudController = require('../utils/controllerFactory');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const { prepareQuotation } = require('../services/quotation.service');
const PDFDocument = require('pdfkit');

const base = createCrudController({
  Model: Quotation,
  populate: 'company contact opportunity owner items.product',
  transformCreate: prepareQuotation,
  transformUpdate: async (body) => {
    if (body.items) return prepareQuotation(body);
    return body;
  },
});

module.exports = {
  ...base,
  status: asyncHandler(async (req, res) => {
    const doc = await Quotation.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true, runValidators: true },
    );
    if (!doc) return res.status(404).json({ success: false, message: 'Quotation not found' });
    sendSuccess(res, doc, 'Quotation status updated');
  }),
  pdf: asyncHandler(async (req, res) => {
    const quotation = await Quotation.findById(req.params.id).populate('company contact');
    if (!quotation) return res.status(404).json({ success: false, message: 'Quotation not found' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${quotation.quotationNumber}.pdf"`);

    const pdf = new PDFDocument({ margin: 50 });
    pdf.pipe(res);

    pdf.fontSize(20).text('QUOTATION');
    pdf.moveDown();
    pdf.fontSize(12).text(`Quotation: ${quotation.quotationNumber}`);
    pdf.text(`Date: ${new Date(quotation.issueDate).toLocaleDateString()}`);
    pdf.text(`Customer: ${quotation.company?.name || 'N/A'}`);
    pdf.moveDown();

    quotation.items.forEach((item, index) => {
      pdf.text(`${index + 1}. ${item.description || 'Item'} | Qty: ${item.quantity} | Price: ${item.unitPrice}`);
    });

    pdf.moveDown();
    pdf.text(`Subtotal: ${quotation.subtotal}`);
    pdf.text(`Discount: ${quotation.discountTotal}`);
    pdf.text(`Tax: ${quotation.taxTotal}`);
    pdf.fontSize(14).text(`Grand Total: ${quotation.grandTotal}`);

    pdf.end();
  }),
};
