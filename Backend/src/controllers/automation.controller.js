'use strict';

const mongoose = require('mongoose');

const Automation = require('../models/automation.model');
const AutomationExecution = require('../models/automationExecution.model');

const getUserId = (req) => req.user?._id || req.user?.id;

const getPagination = (req) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(
    Math.max(Number(req.query.limit) || 20, 1),
    100
  );

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

/**
 * CREATE AUTOMATION
 */
exports.createAutomation = async (req, res) => {
  try {
    const userId = getUserId(req);

    const automation = await Automation.create({
      ...req.body,
      createdBy: userId,
      updatedBy: userId,
    });

    return res.status(201).json({
      success: true,
      message: 'Automation created successfully',
      data: automation,
    });
  } catch (error) {
    console.error('createAutomation:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to create automation',
      error: error.message,
    });
  }
};

/**
 * GET AUTOMATIONS
 */
exports.getAutomations = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req);

    const filter = {
      isDeleted: false,
    };

    if (req.query.status) {
      filter.status = req.query.status;
    }

    if (req.query.module) {
      filter.module = req.query.module;
    }

    if (req.query.search) {
      filter.$or = [
        {
          name: {
            $regex: req.query.search,
            $options: 'i',
          },
        },
        {
          description: {
            $regex: req.query.search,
            $options: 'i',
          },
        },
      ];
    }

    const [automations, total] = await Promise.all([
      Automation.find(filter)
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      Automation.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: automations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('getAutomations:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch automations',
      error: error.message,
    });
  }
};

/**
 * GET AUTOMATION BY ID
 */
exports.getAutomationById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid automation ID',
      });
    }

    const automation = await Automation.findOne({
      _id: id,
      isDeleted: false,
    })
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    if (!automation) {
      return res.status(404).json({
        success: false,
        message: 'Automation not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: automation,
    });
  } catch (error) {
    console.error('getAutomationById:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch automation',
      error: error.message,
    });
  }
};

/**
 * UPDATE AUTOMATION
 */
exports.updateAutomation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid automation ID',
      });
    }

    const automation = await Automation.findOneAndUpdate(
      {
        _id: id,
        isDeleted: false,
      },
      {
        $set: {
          ...req.body,
          updatedBy: userId,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!automation) {
      return res.status(404).json({
        success: false,
        message: 'Automation not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Automation updated successfully',
      data: automation,
    });
  } catch (error) {
    console.error('updateAutomation:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to update automation',
      error: error.message,
    });
  }
};

/**
 * DELETE AUTOMATION
 * Soft delete
 */
exports.deleteAutomation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid automation ID',
      });
    }

    const automation = await Automation.findOneAndUpdate(
      {
        _id: id,
        isDeleted: false,
      },
      {
        $set: {
          isDeleted: true,
          status: 'DRAFT',
          updatedBy: userId,
        },
      },
      {
        new: true,
      }
    );

    if (!automation) {
      return res.status(404).json({
        success: false,
        message: 'Automation not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Automation deleted successfully',
    });
  } catch (error) {
    console.error('deleteAutomation:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to delete automation',
      error: error.message,
    });
  }
};

/**
 * ACTIVATE
 */
exports.activateAutomation = async (req, res) => {
  try {
    const { id } = req.params;

    const automation = await Automation.findOneAndUpdate(
      {
        _id: id,
        isDeleted: false,
      },
      {
        $set: {
          status: 'ACTIVE',
        },
      },
      {
        new: true,
      }
    );

    if (!automation) {
      return res.status(404).json({
        success: false,
        message: 'Automation not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Automation activated successfully',
      data: automation,
    });
  } catch (error) {
    console.error('activateAutomation:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to activate automation',
      error: error.message,
    });
  }
};

/**
 * PAUSE
 */
exports.pauseAutomation = async (req, res) => {
  try {
    const { id } = req.params;

    const automation = await Automation.findOneAndUpdate(
      {
        _id: id,
        isDeleted: false,
      },
      {
        $set: {
          status: 'PAUSED',
        },
      },
      {
        new: true,
      }
    );

    if (!automation) {
      return res.status(404).json({
        success: false,
        message: 'Automation not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Automation paused successfully',
      data: automation,
    });
  } catch (error) {
    console.error('pauseAutomation:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to pause automation',
      error: error.message,
    });
  }
};

/**
 * DUPLICATE
 */
exports.duplicateAutomation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    const source = await Automation.findOne({
      _id: id,
      isDeleted: false,
    }).lean();

    if (!source) {
      return res.status(404).json({
        success: false,
        message: 'Automation not found',
      });
    }

    delete source._id;
    delete source.createdAt;
    delete source.updatedAt;
    delete source.lastExecutedAt;
    delete source.executionCount;

    const duplicate = await Automation.create({
      ...source,
      name: `${source.name} Copy`,
      status: 'DRAFT',
      createdBy: userId,
      updatedBy: userId,
      isDeleted: false,
      executionCount: 0,
      lastExecutedAt: null,
    });

    return res.status(201).json({
      success: true,
      message: 'Automation duplicated successfully',
      data: duplicate,
    });
  } catch (error) {
    console.error('duplicateAutomation:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to duplicate automation',
      error: error.message,
    });
  }
};

/**
 * MANUAL TEST
 */
exports.testAutomation = async (req, res) => {
  try {
    const { id } = req.params;

    const automation = await Automation.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!automation) {
      return res.status(404).json({
        success: false,
        message: 'Automation not found',
      });
    }

    const inputData = req.body?.data || req.body || {};

    const execution = await AutomationExecution.create({
      automation: automation._id,
      triggerEvent: automation.trigger.event,
      module: automation.module,
      recordId: mongoose.Types.ObjectId.isValid(
        inputData._id
      )
        ? inputData._id
        : null,
      status: 'RUNNING',
      inputData,
      startedAt: new Date(),
    });

    /*
     * Phase 1:
     * Actual action execution should be handled by
     * automation engine/service.
     *
     * This controller only creates the test execution
     * record and returns the execution context.
     */

    await AutomationExecution.findByIdAndUpdate(
      execution._id,
      {
        $set: {
          status: 'SUCCESS',
          conditionsPassed: true,
          completedAt: new Date(),
          outputData: {
            message: 'Automation test executed',
            actions: automation.actions,
          },
        },
      }
    );

    return res.status(200).json({
      success: true,
      message: 'Automation test completed',
      data: {
        executionId: execution._id,
        automationId: automation._id,
      },
    });
  } catch (error) {
    console.error('testAutomation:', error);

    return res.status(500).json({
      success: false,
      message: 'Automation test failed',
      error: error.message,
    });
  }
};

/**
 * GET EXECUTION LOGS
 */
exports.getAutomationExecutions = async (req, res) => {
  try {
    const { id } = req.params;
    const { page, limit, skip } = getPagination(req);

    const automation = await Automation.exists({
      _id: id,
      isDeleted: false,
    });

    if (!automation) {
      return res.status(404).json({
        success: false,
        message: 'Automation not found',
      });
    }

    const [executions, total] = await Promise.all([
      AutomationExecution.find({
        automation: id,
      })
        .populate('automation', 'name module')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      AutomationExecution.countDocuments({
        automation: id,
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: executions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('getAutomationExecutions:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch execution logs',
      error: error.message,
    });
  }
};