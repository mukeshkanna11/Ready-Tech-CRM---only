const mongoose = require('mongoose');
const PDFDocument = require('pdfkit');

const Invoice = require('../models/Invoice');

const createCrudController = require('../utils/controllerFactory');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');

const {
  prepareInvoice,
  syncPaymentStatus,
} = require('../services/invoice.service');

// ======================================================
// BASE CRUD
// ======================================================

const base = createCrudController({
  Model: Invoice,

  populate: [
    {
      path: 'quotation',
    },
    {
      path: 'company',
    },
    {
      path: 'contact',
    },
    {
      path: 'owner',
    },
    {
      path: 'items.product',
    },
  ],

  searchFields: [
    'invoiceNumber',
    'status',
    'currency',
  ],

  filterFields: [
    'status',
    'currency',
    'reverseCharge',
  ],

  transformCreate: async (body, req) => {
    return prepareInvoice({
      ...body,

      // Automatically assign logged-in user
      owner:
        body.owner ||
        req.user?._id ||
        req.user?.id ||
        null,
    });
  },

  transformUpdate: async (body) => {
    if (body.items) {
      return prepareInvoice(body);
    }

    return body;
  },
});

// ======================================================
// UPDATE INVOICE STATUS
// PATCH /api/invoices/:id/status
// ======================================================

const status = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status: newStatus } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid invoice ID',
    });
  }

  const allowedStatuses = [
    'DRAFT',
    'SENT',
    'PARTIALLY_PAID',
    'PAID',
    'OVERDUE',
    'CANCELLED',
  ];

  if (!allowedStatuses.includes(newStatus)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid invoice status',
    });
  }

  const invoice = await Invoice.findByIdAndUpdate(
    id,
    {
      status: newStatus,
    },
    {
      new: true,
      runValidators: true,
    }
  ).populate(
    'quotation company contact owner items.product'
  );

  if (!invoice) {
    return res.status(404).json({
      success: false,
      message: 'Invoice not found',
    });
  }

  sendSuccess(
    res,
    invoice,
    'Invoice status updated successfully'
  );
});

// ======================================================
// UPDATE PAYMENT
// PATCH /api/invoices/:id/payment
// ======================================================

const payment = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid invoice ID',
    });
  }

  const invoice = await Invoice.findById(id);

  if (!invoice) {
    return res.status(404).json({
      success: false,
      message: 'Invoice not found',
    });
  }

  if (invoice.status === 'CANCELLED') {
    return res.status(400).json({
      success: false,
      message: 'Cannot update payment for a cancelled invoice',
    });
  }

  const amountPaid = Number(req.body.amountPaid);

  if (!Number.isFinite(amountPaid) || amountPaid < 0) {
    return res.status(400).json({
      success: false,
      message: 'Invalid payment amount',
    });
  }

  if (amountPaid > invoice.grandTotal) {
    return res.status(400).json({
      success: false,
      message: 'Payment cannot exceed invoice total',
    });
  }

  invoice.amountPaid = amountPaid;

  await syncPaymentStatus(invoice);

  await invoice.save();

  await invoice.populate(
    'quotation company contact owner items.product'
  );

  sendSuccess(
    res,
    invoice,
    'Invoice payment updated successfully'
  );
});

// ======================================================
// GENERATE PDF
// GET /api/invoices/:id/pdf
// ======================================================

const pdf = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid invoice ID',
    });
  }

  const invoice = await Invoice.findById(id).populate(
    'quotation company contact owner items.product'
  );

  if (!invoice) {
    return res.status(404).json({
      success: false,
      message: 'Invoice not found',
    });
  }

  const company = invoice.company;
  const contact = invoice.contact;

  res.setHeader(
    'Content-Type',
    'application/pdf'
  );

  res.setHeader(
    'Content-Disposition',
    `inline; filename="${invoice.invoiceNumber}.pdf"`
  );

  const document = new PDFDocument({
    size: 'A4',
    margin: 40,
    bufferPages: true,
  });

  document.pipe(res);

  // ====================================================
  // HEADER
  // ====================================================

  document
    .fontSize(24)
    .font('Helvetica-Bold')
    .text('INVOICE', {
      align: 'right',
    });

  document
    .moveDown(0.5)
    .fontSize(10)
    .font('Helvetica')
    .text(`Invoice No: ${invoice.invoiceNumber}`, {
      align: 'right',
    });

  document.text(
    `Issue Date: ${formatDate(invoice.issueDate)}`,
    {
      align: 'right',
    }
  );

  if (invoice.dueDate) {
    document.text(
      `Due Date: ${formatDate(invoice.dueDate)}`,
      {
        align: 'right',
      }
    );
  }

  document.moveDown(1);

  // ====================================================
  // CUSTOMER
  // ====================================================

  document
    .fontSize(11)
    .font('Helvetica-Bold')
    .text('BILL TO');

  document
    .fontSize(10)
    .font('Helvetica')
    .text(company?.name || 'N/A');

  if (company?.email) {
    document.text(company.email);
  }

  if (company?.phone) {
    document.text(company.phone);
  }

  if (company?.address) {
    const address = [
      company.address.street,
      company.address.city,
      company.address.state,
      company.address.country,
      company.address.postalCode,
    ]
      .filter(Boolean)
      .join(', ');

    if (address) {
      document.text(address);
    }
  }

  if (company?.taxNumber) {
    document.text(`Tax No: ${company.taxNumber}`);
  }

  if (invoice.placeOfSupply) {
    document.text(
      `Place of Supply: ${invoice.placeOfSupply}`
    );
  }

  if (contact) {
    document.moveDown(0.3);

    document
      .font('Helvetica-Bold')
      .text('Contact');

    document
      .font('Helvetica')
      .text(
        [contact.firstName, contact.lastName]
          .filter(Boolean)
          .join(' ')
      );

    if (contact.email) {
      document.text(contact.email);
    }
  }

  document.moveDown(1);

  // ====================================================
  // ITEMS TABLE HEADER
  // ====================================================

  const tableTop = document.y;

  document
    .font('Helvetica-Bold')
    .fontSize(9);

  document.text('Item', 40, tableTop, {
    width: 190,
  });

  document.text('Qty', 235, tableTop, {
    width: 45,
    align: 'right',
  });

  document.text('Price', 285, tableTop, {
    width: 70,
    align: 'right',
  });

  document.text('Tax', 360, tableTop, {
    width: 55,
    align: 'right',
  });

  document.text('Total', 420, tableTop, {
    width: 130,
    align: 'right',
  });

  document.moveTo(40, tableTop + 15)
    .lineTo(555, tableTop + 15)
    .stroke();

  document.y = tableTop + 25;

  // ====================================================
  // ITEMS
  // ====================================================

  document.font('Helvetica').fontSize(9);

  invoice.items.forEach((item) => {
    if (document.y > 720) {
      document.addPage();
    }

    const itemName =
      item.description ||
      item.product?.name ||
      'Item';

    const itemTotal =
      Number(item.total || 0);

    document.text(itemName, 40, document.y, {
      width: 190,
    });

    document.text(
      String(item.quantity || 0),
      235,
      document.y,
      {
        width: 45,
        align: 'right',
      }
    );

    document.text(
      formatMoney(
        item.unitPrice,
        invoice.currency
      ),
      285,
      document.y,
      {
        width: 70,
        align: 'right',
      }
    );

    document.text(
      `${item.taxRate || 0}%`,
      360,
      document.y,
      {
        width: 55,
        align: 'right',
      }
    );

    document.text(
      formatMoney(
        itemTotal,
        invoice.currency
      ),
      420,
      document.y,
      {
        width: 130,
        align: 'right',
      }
    );

    document.moveDown(1.2);
  });

  // ====================================================
  // TOTALS
  // ====================================================

  document.moveDown(1);

  const totalsX = 350;

  document
    .fontSize(10)
    .font('Helvetica');

  addTotal(
    document,
    'Subtotal',
    invoice.subtotal,
    invoice.currency,
    totalsX
  );

  addTotal(
    document,
    'Discount',
    invoice.discountTotal,
    invoice.currency,
    totalsX
  );

  addTotal(
    document,
    'Taxable Amount',
    invoice.taxableTotal,
    invoice.currency,
    totalsX
  );

  addTotal(
    document,
    'CGST',
    invoice.cgstTotal,
    invoice.currency,
    totalsX
  );

  addTotal(
    document,
    'SGST',
    invoice.sgstTotal,
    invoice.currency,
    totalsX
  );

  addTotal(
    document,
    'IGST',
    invoice.igstTotal,
    invoice.currency,
    totalsX
  );

  document
    .moveDown(0.3)
    .font('Helvetica-Bold')
    .fontSize(13)
    .text(
      `Grand Total: ${formatMoney(
        invoice.grandTotal,
        invoice.currency
      )}`,
      totalsX,
      document.y
    );

  document
    .font('Helvetica')
    .fontSize(10)
    .moveDown(0.4)
    .text(
      `Paid: ${formatMoney(
        invoice.amountPaid,
        invoice.currency
      )}`,
      totalsX
    );

  document.text(
    `Balance Due: ${formatMoney(
      invoice.balanceDue,
      invoice.currency
    )}`,
    totalsX
  );

  // ====================================================
  // NOTES
  // ====================================================

  if (invoice.notes) {
    document.moveDown(1.5);

    document
      .font('Helvetica-Bold')
      .fontSize(10)
      .text('Notes');

    document
      .font('Helvetica')
      .fontSize(9)
      .text(invoice.notes);
  }

  // ====================================================
  // FOOTER
  // ====================================================

  document
    .fontSize(8)
    .fillColor('#666666')
    .text(
      'Thank you for your business.',
      40,
      760,
      {
        align: 'center',
        width: 515,
      }
    );

  document.end();
});

// ======================================================
// HELPERS
// ======================================================

function formatDate(date) {
  if (!date) return '-';

  return new Date(date).toLocaleDateString('en-IN');
}

function formatMoney(amount, currency = 'INR') {
  return `${currency} ${Number(amount || 0).toFixed(2)}`;
}

function addTotal(
  document,
  label,
  amount,
  currency,
  x
) {
  document
    .text(
      `${label}: ${formatMoney(amount, currency)}`,
      x,
      document.y
    );

  document.moveDown(0.3);
}

// ======================================================
// EXPORT
// ======================================================

module.exports = {
  ...base,
  status,
  payment,
  pdf,
};