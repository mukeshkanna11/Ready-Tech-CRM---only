'use strict';

const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    // ======================================================
    // BASIC PRODUCT INFORMATION
    // ======================================================

    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    sku: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },

    description: {
      type: String,
      trim: true,
      default: '',
    },

    shortDescription: {
      type: String,
      trim: true,
      default: '',
    },

    // ======================================================
    // BARCODE
    // ======================================================

    barcode: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      index: true,
    },

    barcodeType: {
      type: String,
      enum: [
        'EAN13',
        'EAN8',
        'UPC',
        'CODE128',
        'CODE39',
        'ITF14',
        'QR',
        'CUSTOM',
      ],
      default: 'CODE128',
    },

    // ======================================================
    // PRODUCT CLASSIFICATION
    // ======================================================

    productType: {
      type: String,
      enum: [
        'product',
        'service',
        'digital',
        'subscription',
      ],
      default: 'product',
      index: true,
    },

    category: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },

    subcategory: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },

    brand: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },

    tags: {
      type: [String],
      default: [],
    },

    // ======================================================
    // UNIT
    // ======================================================

    unit: {
      type: String,
      trim: true,
      default: 'unit',
    },

    // ======================================================
    // PRICING
    // ======================================================

    purchasePrice: {
      type: Number,
      min: 0,
      default: 0,
    },

    sellingPrice: {
      type: Number,
      min: 0,
      required: true,
    },

    mrp: {
      type: Number,
      min: 0,
      default: 0,
    },

    currency: {
      type: String,
      uppercase: true,
      trim: true,
      default: 'INR',
    },

    taxRate: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    discountRate: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    // ======================================================
    // TAX / GST
    // ======================================================

    taxType: {
      type: String,
      enum: [
        'inclusive',
        'exclusive',
      ],
      default: 'exclusive',
    },

    hsnSacCode: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },

    gstRate: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    // ======================================================
    // INVENTORY
    // ======================================================

    trackInventory: {
      type: Boolean,
      default: true,
      index: true,
    },

    currentStock: {
      type: Number,
      min: 0,
      default: 0,
    },

    openingStock: {
      type: Number,
      min: 0,
      default: 0,
    },

    reservedStock: {
      type: Number,
      min: 0,
      default: 0,
    },

    reorderLevel: {
      type: Number,
      min: 0,
      default: 0,
    },

    minimumStock: {
      type: Number,
      min: 0,
      default: 0,
    },

    maximumStock: {
      type: Number,
      min: 0,
      default: 0,
    },

    // ======================================================
    // INVENTORY TRACKING
    // ======================================================

    inventoryTracking: {
      type: String,
      enum: [
        'none',
        'quantity',
        'batch',
        'serial',
        'expiry',
      ],
      default: 'quantity',
    },

    hasBatchTracking: {
      type: Boolean,
      default: false,
    },

    hasSerialTracking: {
      type: Boolean,
      default: false,
    },

    hasExpiryTracking: {
      type: Boolean,
      default: false,
    },

    // ======================================================
    // SUPPLIER / VENDOR
    // ======================================================

    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      default: null,
      index: true,
    },

    manufacturer: {
      type: String,
      trim: true,
      default: '',
    },

    // ======================================================
    // WAREHOUSE
    // ======================================================

    warehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      default: null,
      index: true,
    },

    location: {
      type: String,
      trim: true,
      default: '',
    },

    // ======================================================
    // PRODUCT IMAGE / MEDIA
    // ======================================================

    image: {
      type: String,
      trim: true,
      default: '',
    },

    images: {
      type: [String],
      default: [],
    },

    // ======================================================
    // PRODUCT VARIANTS
    // ======================================================

    hasVariants: {
      type: Boolean,
      default: false,
    },

    variants: [
      {
        name: {
          type: String,
          trim: true,
        },

        sku: {
          type: String,
          uppercase: true,
          trim: true,
        },

        barcode: {
          type: String,
          trim: true,
        },

        attributes: {
          type: Map,
          of: String,
          default: {},
        },

        purchasePrice: {
          type: Number,
          min: 0,
          default: 0,
        },

        sellingPrice: {
          type: Number,
          min: 0,
          default: 0,
        },

        stock: {
          type: Number,
          min: 0,
          default: 0,
        },

        image: {
          type: String,
          trim: true,
          default: '',
        },

        isActive: {
          type: Boolean,
          default: true,
        },
      },
    ],

    // ======================================================
    // PRODUCT STATUS
    // ======================================================

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);


// ======================================================
// INDEXES
// ======================================================

productSchema.index({
  name: 'text',
  sku: 'text',
  barcode: 'text',
  description: 'text',
});

productSchema.index({
  category: 1,
  brand: 1,
  isActive: 1,
});

productSchema.index({
  currentStock: 1,
  reorderLevel: 1,
});


// ======================================================
// VIRTUALS
// ======================================================

productSchema.virtual('availableStock').get(function () {
  return Math.max(
    0,
    (this.currentStock || 0) -
      (this.reservedStock || 0)
  );
});


// ======================================================
// JSON OUTPUT
// ======================================================

productSchema.set('toJSON', {
  virtuals: true,
});

productSchema.set('toObject', {
  virtuals: true,
});


module.exports = mongoose.model(
  'Product',
  productSchema
);