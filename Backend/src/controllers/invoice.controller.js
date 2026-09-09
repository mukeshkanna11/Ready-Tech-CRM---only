const fs = require('fs');
const path = require('path');

const mongoose = require('mongoose');
const PDFDocument = require('pdfkit');

const Invoice = require('../models/Invoice');

const createCrudController = require('../utils/controllerFactory');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { sendSuccess } = require('../utils/apiResponse');

const {
  prepareInvoice,
  buildInvoiceFromSalesOrder,
  syncPaymentStatus,
} = require('../services/invoice.service');

const POPULATE = [
  {
    path: 'quotation',
  },
  {
    path: 'salesOrder',
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
];

const POPULATE_PATHS =
  'quotation salesOrder company contact owner items.product';

const INVOICE_STATUSES = [
  'DRAFT',
  'SENT',
  'PARTIALLY_PAID',
  'PAID',
  'OVERDUE',
  'CANCELLED',
];

// ======================================================
// BASE CRUD
// ======================================================

const base = createCrudController({
  Model: Invoice,

  populate: POPULATE,

  searchFields: [
    'invoiceNumber',
    'status',
    'currency',
  ],

  filterFields: [
    'status',
    'currency',
    'reverseCharge',
    'taxMode',
  ],

  allowedSortFields: [
    'createdAt',
    'issueDate',
    'dueDate',
    'invoiceNumber',
    'grandTotal',
    'balanceDue',
    'status',
  ],

  // NOTE: create is implemented below (not via the
  // factory) so a duplicate invoice number can be
  // retried, so no transformCreate is needed here.

  transformUpdate: async (
    body,
    req,
    existing
  ) => {
    // A cancelled invoice is final.
    if (
      existing?.status === 'CANCELLED'
    ) {
      throw new ApiError(
        400,
        'A cancelled invoice cannot be edited',
        'INVOICE_CANCELLED'
      );
    }

    // Never let an update rewrite the invoice number.
    delete body.invoiceNumber;

    if (body.items) {
      const prepared =
        await prepareInvoice({
          ...body,

          // prepareInvoice() always resolves a number;
          // keep the existing one.
          invoiceNumber:
            existing.invoiceNumber,

          taxMode:
            body.taxMode ??
            existing.taxMode,

          // A partial update must not wipe the
          // payment already recorded.
          amountPaid:
            body.amountPaid ??
            existing.amountPaid,
        });

      // The number is unchanged, so don't include it
      // in the update payload at all.
      delete prepared.invoiceNumber;

      // Re-derive the payment status against the new
      // totals, otherwise an invoice whose total just
      // increased would stay PAID.
      const synced = await syncPaymentStatus(
        {
          status:
            body.status ?? existing.status,

          grandTotal: prepared.grandTotal,
          amountPaid: prepared.amountPaid,

          dueDate:
            prepared.dueDate ??
            existing.dueDate,
        },
        {
          save: false,
        }
      );

      prepared.amountPaid = synced.amountPaid;
      prepared.balanceDue = synced.balanceDue;
      prepared.status = synced.status;

      return prepared;
    }

    return body;
  },
});

// ======================================================
// CREATE INVOICE
// POST /api/invoices
// ======================================================
//
// Wraps the factory create with a retry so two
// concurrent creates cannot fail on the unique
// invoiceNumber index.
//
// ======================================================

const create = asyncHandler(
  async (req, res) => {
    if (
      !req.body ||
      typeof req.body !== 'object' ||
      Array.isArray(req.body)
    ) {
      throw new ApiError(
        400,
        'Request body must be a valid object',
        'INVALID_BODY'
      );
    }

    const {
      _id,
      __v,
      createdAt,
      updatedAt,
      ...body
    } = req.body;

    const MAX_ATTEMPTS = 4;

    let lastError = null;

    for (
      let attempt = 1;
      attempt <= MAX_ATTEMPTS;
      attempt += 1
    ) {
      const payload =
        await prepareInvoice({
          ...body,

          owner:
            body.owner ||
            req.user?._id ||
            req.user?.id ||
            null,

          // Only honour a caller-supplied number on
          // the first attempt; afterwards always
          // regenerate so a clash can resolve.
          invoiceNumber:
            attempt === 1
              ? body.invoiceNumber
              : undefined,
        });

      try {
        const invoice =
          await Invoice.create(payload);

        await invoice.populate(
          POPULATE_PATHS
        );

        return sendSuccess(
          res,
          invoice,
          'Invoice created successfully',
          201
        );
      } catch (error) {
        const isDuplicateNumber =
          error?.code === 11000 &&
          (error?.keyPattern
            ?.invoiceNumber ||
            error?.keyValue
              ?.invoiceNumber);

        if (!isDuplicateNumber) {
          throw error;
        }

        lastError = error;
      }
    }

    throw new ApiError(
      409,
      'Could not allocate a unique invoice number. Please retry.',
      'INVOICE_NUMBER_CONFLICT',
      lastError?.keyValue || null
    );
  }
);

// ======================================================
// CREATE INVOICE FROM SALES ORDER
// POST /api/invoices/from-sales-order/:salesOrderId
// ======================================================

const createFromSalesOrder = asyncHandler(
  async (req, res) => {
    const { salesOrderId } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(
        salesOrderId
      )
    ) {
      throw new ApiError(
        400,
        'Invalid sales order ID',
        'INVALID_ID'
      );
    }

    const payload =
      await buildInvoiceFromSalesOrder(
        salesOrderId,
        {
          owner:
            req.body?.owner ||
            req.user?._id ||
            req.user?.id ||
            null,

          ...(req.body?.issueDate
            ? {
                issueDate:
                  req.body.issueDate,
              }
            : {}),

          ...(req.body?.dueDate
            ? {
                dueDate:
                  req.body.dueDate,
              }
            : {}),

          ...(req.body?.taxMode
            ? {
                taxMode:
                  req.body.taxMode,
              }
            : {}),
        }
      );

    const invoice =
      await Invoice.create(payload);

    await invoice.populate(
      POPULATE_PATHS
    );

    return sendSuccess(
      res,
      invoice,
      'Invoice created from sales order successfully',
      201
    );
  }
);

// ======================================================
// UPDATE INVOICE STATUS
// PATCH /api/invoices/:id/status
// ======================================================

const status = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status: newStatus } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(
      400,
      'Invalid invoice ID',
      'INVALID_ID'
    );
  }

  if (!INVOICE_STATUSES.includes(newStatus)) {
    throw new ApiError(
      400,
      'Invalid invoice status',
      'INVALID_STATUS'
    );
  }

  const invoice =
    await Invoice.findById(id);

  if (!invoice) {
    throw new ApiError(
      404,
      'Invoice not found',
      'INVOICE_NOT_FOUND'
    );
  }

  if (invoice.status === 'CANCELLED') {
    throw new ApiError(
      400,
      'A cancelled invoice cannot change status',
      'INVOICE_CANCELLED'
    );
  }

  invoice.status = newStatus;

  await invoice.save();

  await invoice.populate(POPULATE_PATHS);

  return sendSuccess(
    res,
    invoice,
    'Invoice status updated successfully'
  );
});

// ======================================================
// CANCEL INVOICE
// PATCH /api/invoices/:id/cancel
// ======================================================

const cancel = asyncHandler(
  async (req, res) => {
    const { id } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(
        id
      )
    ) {
      throw new ApiError(
        400,
        'Invalid invoice ID',
        'INVALID_ID'
      );
    }

    const invoice =
      await Invoice.findById(id);

    if (!invoice) {
      throw new ApiError(
        404,
        'Invoice not found',
        'INVOICE_NOT_FOUND'
      );
    }

    if (
      invoice.status === 'CANCELLED'
    ) {
      throw new ApiError(
        400,
        'Invoice is already cancelled',
        'INVOICE_CANCELLED'
      );
    }

    if (invoice.status === 'PAID') {
      throw new ApiError(
        400,
        'A fully paid invoice cannot be cancelled',
        'INVOICE_PAID'
      );
    }

    invoice.status = 'CANCELLED';

    invoice.cancellationReason =
      String(
        req.body?.cancellationReason || ''
      ).trim();

    await invoice.save();

    await invoice.populate(
      POPULATE_PATHS
    );

    return sendSuccess(
      res,
      invoice,
      'Invoice cancelled successfully'
    );
  }
);

// ======================================================
// UPDATE PAYMENT
// PATCH /api/invoices/:id/payment
// ======================================================

const payment = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(
      400,
      'Invalid invoice ID',
      'INVALID_ID'
    );
  }

  const invoice = await Invoice.findById(id);

  if (!invoice) {
    throw new ApiError(
      404,
      'Invoice not found',
      'INVOICE_NOT_FOUND'
    );
  }

  if (invoice.status === 'CANCELLED') {
    throw new ApiError(
      400,
      'Cannot update payment for a cancelled invoice',
      'INVOICE_CANCELLED'
    );
  }

  const amountPaid = Number(req.body.amountPaid);

  if (!Number.isFinite(amountPaid) || amountPaid < 0) {
    throw new ApiError(
      400,
      'Invalid payment amount',
      'INVALID_PAYMENT'
    );
  }

  if (amountPaid > invoice.grandTotal) {
    throw new ApiError(
      400,
      'Payment cannot exceed invoice total',
      'INVALID_PAYMENT'
    );
  }

  invoice.amountPaid = amountPaid;

  await syncPaymentStatus(invoice);

  await invoice.populate(POPULATE_PATHS);

  return sendSuccess(
    res,
    invoice,
    'Invoice payment updated successfully'
  );
});

// ======================================================
// COMPANY (SELLER) DETAILS
// ======================================================
//
// Reads the existing company configuration from the
// environment. Nothing is invented: any key that is not
// configured is simply left out of the PDF.
//
// ======================================================

const getSellerDetails = () => {
  return {
    name:
      process.env.COMPANY_NAME ||
      'Ready Tech Solutions',

    addressLines: [
      process.env.COMPANY_ADDRESS_LINE1,
      process.env.COMPANY_ADDRESS_LINE2,
      [
        process.env.COMPANY_CITY,
        process.env.COMPANY_STATE,
        process.env.COMPANY_POSTAL_CODE,
      ]
        .filter(Boolean)
        .join(', '),
      process.env.COMPANY_COUNTRY,
    ].filter(Boolean),

    phone: process.env.COMPANY_PHONE,
    email: process.env.COMPANY_EMAIL,
    website: process.env.COMPANY_WEBSITE,
    gstin: process.env.COMPANY_GSTIN,
    pan: process.env.COMPANY_PAN,
  };
};

// ======================================================
// COMPANY LOGO
// ======================================================
//
// Uses the existing project logo. Returns null when no
// logo file is present, in which case the PDF simply
// renders the company name instead.
//
// ======================================================

const resolveLogoPath = () => {
  const candidates = [
    process.env.COMPANY_LOGO_PATH,

    path.resolve(
      __dirname,
      '../../../Frontend/src/assets/Rtech-logo.png'
    ),

    path.resolve(
      __dirname,
      '../assets/Rtech-logo.png'
    ),
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    } catch {
      // Ignore unreadable candidates.
    }
  }

  return null;
};

// ======================================================
// PDF LAYOUT CONSTANTS
// ======================================================

const PAGE_MARGIN = 40;
const PAGE_WIDTH = 595.28; // A4
const PAGE_HEIGHT = 841.89; // A4

const CONTENT_LEFT = PAGE_MARGIN;
const CONTENT_RIGHT = PAGE_WIDTH - PAGE_MARGIN;
const CONTENT_WIDTH = CONTENT_RIGHT - CONTENT_LEFT;

// Reserve space for the footer.
const BODY_BOTTOM = PAGE_HEIGHT - 70;

// Item table columns.
const COLUMNS = [
  {
    key: 'sno',
    label: '#',
    x: CONTENT_LEFT,
    width: 22,
    align: 'left',
  },
  {
    key: 'item',
    label: 'Item & Description',
    x: CONTENT_LEFT + 22,
    width: 168,
    align: 'left',
  },
  {
    key: 'hsn',
    label: 'HSN/SAC',
    x: CONTENT_LEFT + 190,
    width: 52,
    align: 'left',
  },
  {
    key: 'qty',
    label: 'Qty',
    x: CONTENT_LEFT + 242,
    width: 44,
    align: 'right',
  },
  {
    key: 'rate',
    label: 'Rate',
    x: CONTENT_LEFT + 286,
    width: 60,
    align: 'right',
  },
  {
    key: 'discount',
    label: 'Disc.',
    x: CONTENT_LEFT + 346,
    width: 48,
    align: 'right',
  },
  {
    key: 'tax',
    label: 'GST %',
    x: CONTENT_LEFT + 394,
    width: 42,
    align: 'right',
  },
  {
    key: 'total',
    label: 'Amount',
    x: CONTENT_LEFT + 436,
    width: CONTENT_RIGHT - (CONTENT_LEFT + 436),
    align: 'right',
  },
];

// ======================================================
// PDF HELPERS
// ======================================================

function formatDate(date) {
  if (!date) return '-';

  return new Date(date).toLocaleDateString(
    'en-IN',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }
  );
}

function formatMoney(amount, currency = 'INR') {
  const value = Number(amount || 0).toFixed(2);

  // Thousands separators, Indian-friendly and
  // safe for the built-in PDF fonts.
  const [whole, decimals] = value.split('.');

  const grouped = whole.replace(
    /\B(?=(\d{3})+(?!\d))/g,
    ','
  );

  return `${currency} ${grouped}.${decimals}`;
}

function customerName(invoice) {
  const company = invoice.company;
  const contact = invoice.contact;

  if (company?.name) {
    return company.name;
  }

  const fullName = [
    contact?.firstName,
    contact?.lastName,
  ]
    .filter(Boolean)
    .join(' ');

  return fullName || 'N/A';
}

function addressLines(address) {
  if (!address) return [];

  if (typeof address === 'string') {
    return [address];
  }

  return [
    address.street,
    [
      address.city,
      address.state,
      address.postalCode,
    ]
      .filter(Boolean)
      .join(', '),
    address.country,
  ].filter(Boolean);
}

/**
 * Draw the item table header at the current y.
 */
function drawTableHeader(document) {
  const top = document.y;

  document
    .rect(
      CONTENT_LEFT,
      top,
      CONTENT_WIDTH,
      22
    )
    .fill('#f1f5f9');

  document
    .fillColor('#334155')
    .font('Helvetica-Bold')
    .fontSize(8);

  COLUMNS.forEach((column) => {
    document.text(
      column.label.toUpperCase(),
      column.x + 4,
      top + 7,
      {
        width: column.width - 8,
        align: column.align,
        lineBreak: false,
      }
    );
  });

  document
    .moveTo(CONTENT_LEFT, top + 22)
    .lineTo(CONTENT_RIGHT, top + 22)
    .lineWidth(0.5)
    .strokeColor('#cbd5e1')
    .stroke();

  document.y = top + 22;
  document.fillColor('#0f172a');
}

/**
 * Start a new page and repeat the table header.
 */
function newTablePage(document) {
  document.addPage();

  document.y = PAGE_MARGIN;

  drawTableHeader(document);
}

/**
 * Reserve vertical space, adding a page when needed.
 */
function ensureSpace(
  document,
  requiredHeight,
  { repeatTableHeader = false } = {}
) {
  if (
    document.y + requiredHeight <=
    BODY_BOTTOM
  ) {
    return;
  }

  if (repeatTableHeader) {
    newTablePage(document);
    return;
  }

  document.addPage();

  document.y = PAGE_MARGIN;
}

/**
 * One label/value totals row, right aligned.
 */
function drawTotalsRow(
  document,
  label,
  value,
  {
    bold = false,
    size = 9,
    color = '#334155',
  } = {}
) {
  const labelX = CONTENT_RIGHT - 250;
  const labelWidth = 140;
  const valueX = CONTENT_RIGHT - 110;
  const valueWidth = 110;

  const rowY = document.y;

  document
    .font(
      bold
        ? 'Helvetica-Bold'
        : 'Helvetica'
    )
    .fontSize(size)
    .fillColor(color);

  document.text(label, labelX, rowY, {
    width: labelWidth,
    align: 'right',
    lineBreak: false,
  });

  document.text(value, valueX, rowY, {
    width: valueWidth,
    align: 'right',
    lineBreak: false,
  });

  document.y = rowY + size + 5;
}

/**
 * Wrapped text block used for notes / terms.
 */
function drawTextBlock(
  document,
  title,
  body
) {
  const height =
    document.heightOfString(body, {
      width: CONTENT_WIDTH,
    }) + 26;

  ensureSpace(document, height);

  document
    .font('Helvetica-Bold')
    .fontSize(9)
    .fillColor('#0f172a')
    .text(
      title.toUpperCase(),
      CONTENT_LEFT,
      document.y,
      {
        width: CONTENT_WIDTH,
      }
    );

  document.moveDown(0.3);

  document
    .font('Helvetica')
    .fontSize(8.5)
    .fillColor('#475569')
    .text(body, CONTENT_LEFT, document.y, {
      width: CONTENT_WIDTH,
      align: 'left',
    });

  document.moveDown(0.8);
}

// ======================================================
// GENERATE PDF
// GET /api/invoices/:id/pdf
// ======================================================

const pdf = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(
      400,
      'Invalid invoice ID',
      'INVALID_ID'
    );
  }

  const invoice = await Invoice.findById(id)
    .populate(POPULATE_PATHS)
    .lean();

  if (!invoice) {
    throw new ApiError(
      404,
      'Invoice not found',
      'INVOICE_NOT_FOUND'
    );
  }

  const seller = getSellerDetails();
  const logoPath = resolveLogoPath();

  const currency = invoice.currency || 'INR';

  // ----------------------------------------------------
  // Response headers
  // ----------------------------------------------------
  //
  // ?download=1 forces a file download, otherwise the
  // PDF renders inline (used by the print preview).
  //
  // ----------------------------------------------------

  const disposition =
    req.query.download === '1' ||
    req.query.download === 'true'
      ? 'attachment'
      : 'inline';

  res.setHeader(
    'Content-Type',
    'application/pdf'
  );

  res.setHeader(
    'Content-Disposition',
    `${disposition}; filename="${invoice.invoiceNumber}.pdf"`
  );

  const document = new PDFDocument({
    size: 'A4',
    margin: PAGE_MARGIN,
    bufferPages: true,
  });

  document.pipe(res);

  // ====================================================
  // HEADER - LOGO + COMPANY DETAILS
  // ====================================================

  const headerTop = document.y;

  if (logoPath) {
    try {
      document.image(
        logoPath,
        CONTENT_LEFT,
        headerTop,
        {
          fit: [130, 46],
          align: 'left',
        }
      );
    } catch {
      // A broken image must never break the invoice.
    }
  }

  document
    .font('Helvetica-Bold')
    .fontSize(20)
    .fillColor('#0f172a')
    .text('TAX INVOICE', CONTENT_LEFT, headerTop + 4, {
      width: CONTENT_WIDTH,
      align: 'right',
    });

  document
    .font('Helvetica')
    .fontSize(9)
    .fillColor('#475569');

  document.text(
    `Invoice No: ${invoice.invoiceNumber}`,
    CONTENT_LEFT,
    headerTop + 30,
    {
      width: CONTENT_WIDTH,
      align: 'right',
    }
  );

  document.text(
    `Issue Date: ${formatDate(invoice.issueDate)}`,
    {
      width: CONTENT_WIDTH,
      align: 'right',
    }
  );

  if (invoice.dueDate) {
    document.text(
      `Due Date: ${formatDate(invoice.dueDate)}`,
      {
        width: CONTENT_WIDTH,
        align: 'right',
      }
    );
  }

  document.text(
    `Status: ${invoice.status}`,
    {
      width: CONTENT_WIDTH,
      align: 'right',
    }
  );

  // ----------------------------------------------------
  // Seller block
  // ----------------------------------------------------

  document.y = Math.max(
    document.y,
    headerTop + 52
  );

  document.moveDown(0.4);

  document
    .font('Helvetica-Bold')
    .fontSize(11)
    .fillColor('#0f172a')
    .text(seller.name, CONTENT_LEFT, document.y, {
      width: CONTENT_WIDTH * 0.6,
    });

  document
    .font('Helvetica')
    .fontSize(8.5)
    .fillColor('#475569');

  seller.addressLines.forEach((line) => {
    document.text(line, {
      width: CONTENT_WIDTH * 0.6,
    });
  });

  [
    seller.phone && `Phone: ${seller.phone}`,
    seller.email && `Email: ${seller.email}`,
    seller.website && `Web: ${seller.website}`,
    seller.gstin && `GSTIN: ${seller.gstin}`,
    seller.pan && `PAN: ${seller.pan}`,
  ]
    .filter(Boolean)
    .forEach((line) => {
      document.text(line, {
        width: CONTENT_WIDTH * 0.6,
      });
    });

  document
    .moveTo(CONTENT_LEFT, document.y + 8)
    .lineTo(CONTENT_RIGHT, document.y + 8)
    .lineWidth(1)
    .strokeColor('#e2e8f0')
    .stroke();

  document.y += 18;

  // ====================================================
  // BILL TO
  // ====================================================

  const billToTop = document.y;

  document
    .font('Helvetica-Bold')
    .fontSize(9)
    .fillColor('#0f172a')
    .text('BILL TO', CONTENT_LEFT, billToTop, {
      width: CONTENT_WIDTH / 2 - 10,
    });

  document.moveDown(0.3);

  document
    .font('Helvetica-Bold')
    .fontSize(10)
    .fillColor('#0f172a')
    .text(
      customerName(invoice),
      CONTENT_LEFT,
      document.y,
      {
        width: CONTENT_WIDTH / 2 - 10,
      }
    );

  document
    .font('Helvetica')
    .fontSize(8.5)
    .fillColor('#475569');

  const customer = invoice.company;
  const contact = invoice.contact;

  addressLines(customer?.address).forEach(
    (line) => {
      document.text(line, {
        width: CONTENT_WIDTH / 2 - 10,
      });
    }
  );

  [
    customer?.email &&
      `Email: ${customer.email}`,
    customer?.phone &&
      `Phone: ${customer.phone}`,
    (customer?.gstin ||
      customer?.taxNumber) &&
      `GSTIN: ${
        customer.gstin ||
        customer.taxNumber
      }`,
  ]
    .filter(Boolean)
    .forEach((line) => {
      document.text(line, {
        width: CONTENT_WIDTH / 2 - 10,
      });
    });

  if (contact) {
    const contactName = [
      contact.firstName,
      contact.lastName,
    ]
      .filter(Boolean)
      .join(' ');

    if (contactName) {
      document.text(
        `Contact: ${contactName}`,
        {
          width: CONTENT_WIDTH / 2 - 10,
        }
      );
    }

    if (
      contact.email &&
      contact.email !== customer?.email
    ) {
      document.text(contact.email, {
        width: CONTENT_WIDTH / 2 - 10,
      });
    }
  }

  const billToBottom = document.y;

  // ----------------------------------------------------
  // Invoice meta (right column)
  // ----------------------------------------------------

  const metaX = CONTENT_LEFT + CONTENT_WIDTH / 2 + 10;
  const metaWidth = CONTENT_WIDTH / 2 - 10;

  document.y = billToTop;

  document
    .font('Helvetica-Bold')
    .fontSize(9)
    .fillColor('#0f172a')
    .text('INVOICE DETAILS', metaX, billToTop, {
      width: metaWidth,
    });

  document.moveDown(0.3);

  document
    .font('Helvetica')
    .fontSize(8.5)
    .fillColor('#475569');

  [
    invoice.placeOfSupply &&
      `Place of Supply: ${invoice.placeOfSupply}`,
    `Tax Type: ${
      invoice.taxMode === 'IGST'
        ? 'IGST (Inter-State)'
        : 'CGST + SGST (Intra-State)'
    }`,
    `Currency: ${currency}`,
    invoice.reverseCharge
      ? 'Reverse Charge: Yes'
      : 'Reverse Charge: No',
    invoice.salesOrder
      ?.salesOrderNumber &&
      `Sales Order: ${invoice.salesOrder.salesOrderNumber}`,
    invoice.quotation
      ?.quotationNumber &&
      `Quotation: ${invoice.quotation.quotationNumber}`,
  ]
    .filter(Boolean)
    .forEach((line) => {
      document.text(line, metaX, document.y, {
        width: metaWidth,
      });
    });

  document.y =
    Math.max(billToBottom, document.y) + 16;

  // ====================================================
  // ITEMS TABLE
  // ====================================================

  ensureSpace(document, 60);

  drawTableHeader(document);

  document
    .font('Helvetica')
    .fontSize(8.5)
    .fillColor('#0f172a');

  const items = Array.isArray(invoice.items)
    ? invoice.items
    : [];

  items.forEach((item, index) => {
    const itemName =
      item.product?.name ||
      item.description ||
      'Item';

    const itemDescription =
      item.product?.name &&
      item.description &&
      item.description !== item.product.name
        ? item.description
        : '';

    const itemColumn = COLUMNS.find(
      (column) => column.key === 'item'
    );

    // Measure the tallest cell to get the row height.
    const nameHeight =
      document.heightOfString(itemName, {
        width: itemColumn.width - 8,
      });

    const descriptionHeight =
      itemDescription
        ? document.heightOfString(
            itemDescription,
            {
              width: itemColumn.width - 8,
            }
          )
        : 0;

    const rowHeight =
      Math.max(
        16,
        nameHeight + descriptionHeight
      ) + 8;

    ensureSpace(document, rowHeight, {
      repeatTableHeader: true,
    });

    // Capture the row origin ONCE so every cell
    // is drawn on the same baseline.
    const rowY = document.y + 4;

    // Zebra striping
    if (index % 2 === 1) {
      document
        .rect(
          CONTENT_LEFT,
          document.y,
          CONTENT_WIDTH,
          rowHeight
        )
        .fill('#f8fafc');
    }

    document
      .font('Helvetica')
      .fontSize(8.5)
      .fillColor('#0f172a');

    const discountLabel =
      Number(item.discountRate) > 0
        ? `${Number(item.discountRate)}%`
        : formatMoney(
            item.discountAmount,
            ''
          ).trim();

    const values = {
      sno: String(index + 1),
      item: itemName,
      hsn: item.hsnSac || '-',

      qty: `${Number(
        item.quantity || 0
      )} ${item.unit || ''}`.trim(),

      rate: Number(
        item.unitPrice || 0
      ).toFixed(2),

      discount: discountLabel || '-',
      tax: `${Number(item.taxRate || 0)}%`,

      total: Number(
        item.total || 0
      ).toFixed(2),
    };

    COLUMNS.forEach((column) => {
      document.text(
        values[column.key],
        column.x + 4,
        rowY,
        {
          width: column.width - 8,
          align: column.align,
          lineBreak:
            column.key === 'item',
        }
      );
    });

    if (itemDescription) {
      document
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor('#64748b')
        .text(
          itemDescription,
          itemColumn.x + 4,
          rowY + nameHeight + 1,
          {
            width: itemColumn.width - 8,
          }
        );
    }

    document.y = rowY + rowHeight - 4;

    document
      .moveTo(CONTENT_LEFT, document.y)
      .lineTo(CONTENT_RIGHT, document.y)
      .lineWidth(0.3)
      .strokeColor('#e2e8f0')
      .stroke();
  });

  // ====================================================
  // TOTALS + GST BREAKDOWN
  // ====================================================

  ensureSpace(document, 170);

  document.y += 12;

  drawTotalsRow(
    document,
    'Subtotal',
    formatMoney(invoice.subtotal, currency)
  );

  if (Number(invoice.discountTotal) > 0) {
    drawTotalsRow(
      document,
      'Discount',
      `- ${formatMoney(
        invoice.discountTotal,
        currency
      )}`
    );
  }

  drawTotalsRow(
    document,
    'Taxable Amount',
    formatMoney(
      invoice.taxableTotal,
      currency
    )
  );

  // GST breakdown reflects the invoice tax mode.
  if (invoice.taxMode === 'IGST') {
    drawTotalsRow(
      document,
      'IGST',
      formatMoney(
        invoice.igstTotal,
        currency
      )
    );
  } else {
    drawTotalsRow(
      document,
      'CGST',
      formatMoney(
        invoice.cgstTotal,
        currency
      )
    );

    drawTotalsRow(
      document,
      'SGST',
      formatMoney(
        invoice.sgstTotal,
        currency
      )
    );
  }

  drawTotalsRow(
    document,
    'Total Tax',
    formatMoney(invoice.taxTotal, currency)
  );

  // ----------------------------------------------------
  // Grand total band
  // ----------------------------------------------------

  const grandTotalY = document.y + 4;

  document
    .rect(
      CONTENT_RIGHT - 250,
      grandTotalY,
      250,
      24
    )
    .fill('#0f172a');

  document.y = grandTotalY + 7;

  drawTotalsRow(
    document,
    'GRAND TOTAL',
    formatMoney(
      invoice.grandTotal,
      currency
    ),
    {
      bold: true,
      size: 10,
      color: '#ffffff',
    }
  );

  document.y = grandTotalY + 30;

  drawTotalsRow(
    document,
    'Amount Paid',
    formatMoney(
      invoice.amountPaid,
      currency
    )
  );

  drawTotalsRow(
    document,
    'Balance Due',
    formatMoney(
      invoice.balanceDue,
      currency
    ),
    {
      bold: true,
      size: 10,
      color: '#0f172a',
    }
  );

  document.y += 10;

  // ====================================================
  // NOTES
  // ====================================================

  if (invoice.notes) {
    drawTextBlock(
      document,
      'Notes',
      invoice.notes
    );
  }

  // ====================================================
  // TERMS & CONDITIONS
  // ====================================================

  if (invoice.termsAndConditions) {
    drawTextBlock(
      document,
      'Terms & Conditions',
      invoice.termsAndConditions
    );
  }

  if (
    invoice.status === 'CANCELLED' &&
    invoice.cancellationReason
  ) {
    drawTextBlock(
      document,
      'Cancellation Reason',
      invoice.cancellationReason
    );
  }

  // ====================================================
  // FOOTER ON EVERY PAGE
  // ====================================================

  const range = document.bufferedPageRange();

  for (
    let index = 0;
    index < range.count;
    index += 1
  ) {
    document.switchToPage(
      range.start + index
    );

    // The footer sits below the normal bottom margin.
    // Without this, PDFKit's line wrapper treats it as
    // an overflow and appends a blank page.
    const originalBottomMargin =
      document.page.margins.bottom;

    document.page.margins.bottom = 0;

    const footerY = PAGE_HEIGHT - 58;

    document
      .moveTo(CONTENT_LEFT, footerY)
      .lineTo(CONTENT_RIGHT, footerY)
      .lineWidth(0.5)
      .strokeColor('#e2e8f0')
      .stroke();

    document
      .font('Helvetica')
      .fontSize(7.5)
      .fillColor('#94a3b8')
      .text(
        `${seller.name}  |  Invoice ${invoice.invoiceNumber}  |  This is a computer generated invoice.`,
        CONTENT_LEFT,
        footerY + 8,
        {
          width: CONTENT_WIDTH,
          align: 'center',
          lineBreak: false,
        }
      );

    document.text(
      `Page ${index + 1} of ${range.count}`,
      CONTENT_LEFT,
      footerY + 20,
      {
        width: CONTENT_WIDTH,
        align: 'center',
        lineBreak: false,
      }
    );

    document.page.margins.bottom =
      originalBottomMargin;
  }

  document.end();
});

// ======================================================
// EXPORT
// ======================================================

module.exports = {
  ...base,
  create,
  createFromSalesOrder,
  status,
  cancel,
  payment,
  pdf,
};
