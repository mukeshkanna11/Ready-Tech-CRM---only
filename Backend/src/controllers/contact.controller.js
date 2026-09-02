'use strict';

const Contact = require('../models/Contact');
const Company = require('../models/Company');
const User = require('../models/User');


// ======================================================
// CREATE CONTACT
// ======================================================

const createContact = async (req, res, next) => {
  try {
    const {
      firstName,
      lastName,
      designation,
      department,
      email,
      phone,
      alternatePhone,
      website,
      company,
      owner,
      source,
      status,
      address,
      city,
      state,
      country,
      postalCode,
      tags,
      notes,
      lastContactAt,
      nextFollowUpAt,
    } = req.body;

    const contact =
      await Contact.create({
        firstName,
        lastName,
        designation,
        department,
        email,
        phone,
        alternatePhone,
        website,
        company,
        owner,
        source,
        status,
        address,
        city,
        state,
        country,
        postalCode,
        tags,
        notes,
        lastContactAt,
        nextFollowUpAt,
      });

    const populatedContact =
      await Contact.findById(
        contact._id
      )
        .populate(
          'company',
          'name email phone'
        )
        .populate(
          'owner',
          'name email'
        );

    res.status(201).json({
      success: true,
      message: 'Contact created successfully',
      data: populatedContact,
    });
  } catch (error) {
    next(error);
  }
};


// ======================================================
// GET ALL CONTACTS
// ======================================================

const getContacts = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      status,
      company,
      owner,
    } = req.query;

    const pageNumber =
      Math.max(
        Number(page),
        1
      );

    const limitNumber =
      Math.min(
        Math.max(
          Number(limit),
          1
        ),
        100
      );

    const filter = {};

    // ----------------------------------------------
    // SEARCH
    // ----------------------------------------------

    if (search.trim()) {
      const regex =
        new RegExp(
          search.trim(),
          'i'
        );

      filter.$or = [
        {
          firstName: regex,
        },
        {
          lastName: regex,
        },
        {
          email: regex,
        },
        {
          phone: regex,
        },
        {
          designation: regex,
        },
        {
          department: regex,
        },
      ];
    }

    // ----------------------------------------------
    // FILTERS
    // ----------------------------------------------

    if (status) {
      filter.status =
        status.toUpperCase();
    }

    if (company) {
      filter.company =
        company;
    }

    if (owner) {
      filter.owner =
        owner;
    }

    const skip =
      (pageNumber - 1) *
      limitNumber;

    const [
      contacts,
      total,
    ] = await Promise.all([
      Contact.find(filter)
        .populate(
          'company',
          'name email phone'
        )
        .populate(
          'owner',
          'name email'
        )
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(limitNumber),

      Contact.countDocuments(
        filter
      ),
    ]);

    res.json({
      success: true,
      message: 'Contacts fetched successfully',
      data: contacts,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        totalPages:
          Math.ceil(
            total /
              limitNumber
          ),
      },
    });
  } catch (error) {
    next(error);
  }
};


// ======================================================
// GET CONTACT BY ID
// ======================================================

const getContactById = async (
  req,
  res,
  next
) => {
  try {
    const contact =
      await Contact.findById(
        req.params.id
      )
        .populate(
          'company',
          'name email phone'
        )
        .populate(
          'owner',
          'name email'
        );

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found',
      });
    }

    res.json({
      success: true,
      message: 'Contact fetched successfully',
      data: contact,
    });
  } catch (error) {
    next(error);
  }
};


// ======================================================
// UPDATE CONTACT
// ======================================================

const updateContact = async (
  req,
  res,
  next
) => {
  try {
    const contact =
      await Contact.findByIdAndUpdate(
        req.params.id,
        {
          $set: req.body,
        },
        {
          new: true,
          runValidators: true,
        }
      )
        .populate(
          'company',
          'name email phone'
        )
        .populate(
          'owner',
          'name email'
        );

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found',
      });
    }

    res.json({
      success: true,
      message: 'Contact updated successfully',
      data: contact,
    });
  } catch (error) {
    next(error);
  }
};


// ======================================================
// DELETE CONTACT
// ======================================================

const deleteContact = async (
  req,
  res,
  next
) => {
  try {
    const contact =
      await Contact.findByIdAndDelete(
        req.params.id
      );

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found',
      });
    }

    res.json({
      success: true,
      message: 'Contact deleted successfully',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};


// ======================================================
// EXPORT
// ======================================================

module.exports = {
  createContact,
  getContacts,
  getContactById,
  updateContact,
  deleteContact,
};