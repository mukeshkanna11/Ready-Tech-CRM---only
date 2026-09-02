'use strict';

const mongoose = require('mongoose');

const Company = require('../models/Company');
const Lead = require('../models/Lead');
const Contact = require('../models/Contact');


// ======================================================
// HELPERS
// ======================================================

const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

const escapeRegex = (value = '') => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};


// ======================================================
// CREATE COMPANY
// ======================================================

const createCompany = async (req, res, next) => {
  try {
    const {
      name,
      legalName,
      companyCode,
      description,
      industry,
      companyType,
      ownership,
      employeeCount,
      annualRevenue,
      website,
      email,
      phone,
      alternatePhone,
      fax,
      billingAddress,
      shippingAddress,
      gstin,
      pan,
      taxId,
      registrationNumber,
      source,
      status,
      rating,
      owner,
      tags,
      customFields,
    } = req.body;

    // -----------------------------------------------
    // VALIDATION
    // -----------------------------------------------

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Company name is required',
      });
    }

    // -----------------------------------------------
    // DUPLICATE CHECK
    // -----------------------------------------------

    const duplicateQuery = {
      isDeleted: false,
      $or: [
        {
          name: {
            $regex: `^${escapeRegex(name.trim())}$`,
            $options: 'i',
          },
        },
      ],
    };

    if (email) {
      duplicateQuery.$or.push({
        email: email.trim().toLowerCase(),
      });
    }

    if (gstin) {
      duplicateQuery.$or.push({
        gstin: gstin.trim().toUpperCase(),
      });
    }

    const existingCompany = await Company.findOne(duplicateQuery);

    if (existingCompany) {
      return res.status(409).json({
        success: false,
        message: 'Company already exists',
        data: existingCompany,
      });
    }

    // -----------------------------------------------
    // CREATE
    // -----------------------------------------------

    const company = await Company.create({
      name: name.trim(),
      legalName,
      companyCode,
      description,
      industry,
      companyType,
      ownership,
      employeeCount,
      annualRevenue,
      website,
      email,
      phone,
      alternatePhone,
      fax,
      billingAddress,
      shippingAddress,
      gstin,
      pan,
      taxId,
      registrationNumber,
      source,
      status,
      rating,
      owner: owner || req.user?._id,
      tags,
      customFields,
      createdBy: req.user?._id,
      updatedBy: req.user?._id,
    });

    const populatedCompany = await Company.findById(company._id)
      .populate('owner', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email')
      .populate('updatedBy', 'firstName lastName email');

    return res.status(201).json({
      success: true,
      message: 'Company created successfully',
      data: populatedCompany,
    });
  } catch (error) {
    next(error);
  }
};


// ======================================================
// GET ALL COMPANIES
// ======================================================

const getCompanies = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      companyType,
      industry,
      source,
      rating,
      owner,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);

    const limitNumber = Math.min(
      Math.max(parseInt(limit, 10) || 20, 1),
      100
    );

    const skip = (pageNumber - 1) * limitNumber;

    // -----------------------------------------------
    // FILTER
    // -----------------------------------------------

    const filter = {
      isDeleted: false,
    };

    // Search

    if (search && search.trim()) {
      const regex = new RegExp(
        escapeRegex(search.trim()),
        'i'
      );

      filter.$or = [
        { name: regex },
        { legalName: regex },
        { email: regex },
        { phone: regex },
        { industry: regex },
        { gstin: regex },
      ];
    }

    // Status

    if (status) {
      filter.status = status;
    }

    // Company Type

    if (companyType) {
      filter.companyType = companyType;
    }

    // Industry

    if (industry) {
      filter.industry = industry;
    }

    // Source

    if (source) {
      filter.source = source;
    }

    // Rating

    if (rating) {
      filter.rating = rating;
    }

    // Owner

    if (owner) {
      if (!isValidObjectId(owner)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid owner ID',
        });
      }

      filter.owner = owner;
    }

    // -----------------------------------------------
    // SORT
    // -----------------------------------------------

    const allowedSortFields = [
      'name',
      'createdAt',
      'updatedAt',
      'status',
      'companyType',
      'industry',
      'employeeCount',
      'annualRevenue',
    ];

    const safeSortBy = allowedSortFields.includes(sortBy)
      ? sortBy
      : 'createdAt';

    const sort = {
      [safeSortBy]: sortOrder === 'asc' ? 1 : -1,
    };

    // -----------------------------------------------
    // QUERY
    // -----------------------------------------------

    const [companies, total] = await Promise.all([
      Company.find(filter)
        .populate('owner', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName email')
        .populate('updatedBy', 'firstName lastName email')
        .sort(sort)
        .skip(skip)
        .limit(limitNumber)
        .lean(),

      Company.countDocuments(filter),
    ]);

    // -----------------------------------------------
    // RELATION COUNTS
    // -----------------------------------------------

    const companyIds = companies.map(
      (company) => company._id
    );

    const [leadCounts, contactCounts] = await Promise.all([
      Lead.aggregate([
        {
          $match: {
            company: { $in: companyIds },
            isDeleted: false,
          },
        },
        {
          $group: {
            _id: '$company',
            count: { $sum: 1 },
          },
        },
      ]),

      Contact.aggregate([
        {
          $match: {
            company: { $in: companyIds },
            isDeleted: false,
          },
        },
        {
          $group: {
            _id: '$company',
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const leadMap = new Map(
      leadCounts.map((item) => [
        String(item._id),
        item.count,
      ])
    );

    const contactMap = new Map(
      contactCounts.map((item) => [
        String(item._id),
        item.count,
      ])
    );

    const formattedCompanies = companies.map((company) => ({
      ...company,

      leadCount:
        leadMap.get(String(company._id)) || 0,

      contactCount:
        contactMap.get(String(company._id)) || 0,
    }));

    // -----------------------------------------------
    // RESPONSE
    // -----------------------------------------------

    return res.status(200).json({
      success: true,
      data: formattedCompanies,

      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        pages: Math.ceil(total / limitNumber),
        hasNextPage:
          pageNumber < Math.ceil(total / limitNumber),
        hasPreviousPage:
          pageNumber > 1,
      },
    });
  } catch (error) {
    next(error);
  }
};


// ======================================================
// GET COMPANY BY ID
// ======================================================

const getCompanyById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid company ID',
      });
    }

    const company = await Company.findOne({
      _id: id,
      isDeleted: false,
    })
      .populate('owner', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email')
      .populate('updatedBy', 'firstName lastName email')
      .lean();

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found',
      });
    }

    // -----------------------------------------------
    // RELATED LEADS
    // -----------------------------------------------

    const leads = await Lead.find({
      company: id,
      isDeleted: false,
    })
      .populate('owner', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    // -----------------------------------------------
    // RELATED CONTACTS
    // -----------------------------------------------

    const contacts = await Contact.find({
      company: id,
      isDeleted: false,
    })
      .populate('owner', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    return res.status(200).json({
      success: true,

      data: {
        ...company,

        leads,
        contacts,

        leadCount: leads.length,
        contactCount: contacts.length,
      },
    });
  } catch (error) {
    next(error);
  }
};


// ======================================================
// UPDATE COMPANY
// ======================================================

const updateCompany = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid company ID',
      });
    }

    const company = await Company.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found',
      });
    }

    // -----------------------------------------------
    // ALLOWED FIELDS
    // -----------------------------------------------

    const allowedFields = [
      'name',
      'legalName',
      'companyCode',
      'description',
      'industry',
      'companyType',
      'ownership',
      'employeeCount',
      'annualRevenue',
      'website',
      'email',
      'phone',
      'alternatePhone',
      'fax',
      'billingAddress',
      'shippingAddress',
      'gstin',
      'pan',
      'taxId',
      'registrationNumber',
      'source',
      'status',
      'rating',
      'owner',
      'tags',
      'customFields',
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        company[field] = req.body[field];
      }
    });

    company.updatedBy = req.user?._id;

    await company.save();

    const updatedCompany = await Company.findById(company._id)
      .populate('owner', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email')
      .populate('updatedBy', 'firstName lastName email');

    return res.status(200).json({
      success: true,
      message: 'Company updated successfully',
      data: updatedCompany,
    });
  } catch (error) {
    next(error);
  }
};


// ======================================================
// SOFT DELETE COMPANY
// ======================================================

const deleteCompany = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid company ID',
      });
    }

    const company = await Company.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found',
      });
    }

    company.isDeleted = true;
    company.deletedAt = new Date();
    company.updatedBy = req.user?._id;

    await company.save();

    return res.status(200).json({
      success: true,
      message: 'Company deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};


// ======================================================
// RESTORE COMPANY
// ======================================================

const restoreCompany = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid company ID',
      });
    }

    const company = await Company.findOne({
      _id: id,
      isDeleted: true,
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Deleted company not found',
      });
    }

    company.isDeleted = false;
    company.deletedAt = null;
    company.updatedBy = req.user?._id;

    await company.save();

    return res.status(200).json({
      success: true,
      message: 'Company restored successfully',
      data: company,
    });
  } catch (error) {
    next(error);
  }
};


// ======================================================
// GET COMPANY STATS
// ======================================================

const getCompanyStats = async (req, res, next) => {
  try {
    const [
      total,
      active,
      inactive,
      prospects,
      customers,
    ] = await Promise.all([
      Company.countDocuments({
        isDeleted: false,
      }),

      Company.countDocuments({
        isDeleted: false,
        status: 'ACTIVE',
      }),

      Company.countDocuments({
        isDeleted: false,
        status: 'INACTIVE',
      }),

      Company.countDocuments({
        isDeleted: false,
        status: 'PROSPECT',
      }),

      Company.countDocuments({
        isDeleted: false,
        status: 'CUSTOMER',
      }),
    ]);

    return res.status(200).json({
      success: true,

      data: {
        total,
        active,
        inactive,
        prospects,
        customers,
      },
    });
  } catch (error) {
    next(error);
  }
};


// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  createCompany,
  getCompanies,
  getCompanyById,
  updateCompany,
  deleteCompany,
  restoreCompany,
  getCompanyStats,
};