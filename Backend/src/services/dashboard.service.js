const Lead = require('../models/Lead');
const Company = require('../models/Company');
const Contact = require('../models/Contact');
const Opportunity = require('../models/Opportunity');
const Task = require('../models/Task');
const Quotation = require('../models/Quotation');
const Invoice = require('../models/Invoice');

const getDashboard = async () => {
  const [leads, companies, contacts, opportunities, tasks, quotations, invoices] = await Promise.all([
    Lead.countDocuments(),
    Company.countDocuments(),
    Contact.countDocuments(),
    Opportunity.countDocuments(),
    Task.countDocuments({ status: { $ne: 'COMPLETED' } }),
    Quotation.aggregate([{ $group: { _id: null, value: { $sum: '$grandTotal' } } }]),
    Invoice.aggregate([
      { $group: { _id: null, billed: { $sum: '$grandTotal' }, paid: { $sum: '$amountPaid' } } },
    ]),
  ]);

  const [leadStatus, pipeline] = await Promise.all([
    Lead.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Opportunity.aggregate([
      { $group: { _id: '$stage', count: { $sum: 1 }, value: { $sum: '$value' } } },
    ]),
  ]);

  return {
    counts: { leads, companies, contacts, opportunities, pendingTasks: tasks },
    quotationValue: quotations[0]?.value || 0,
    invoiceValue: invoices[0] || { billed: 0, paid: 0 },
    leadStatus,
    pipeline,
  };
};

module.exports = { getDashboard };
