const express = require('express');
const router = express.Router();
const {
  getPrograms,
  getProgram,
  createProgram,
  updateProgram,
  deleteProgram,
  completeProgramDay,
  toggleProgramActive
} = require('../controllers/programController');
const { protect } = require('../middleware/auth');
const { programValidation, validate } = require('../middleware/validator');

router.route('/')
  .get(protect, getPrograms)
  .post(protect, programValidation, validate, createProgram);

router.route('/:id')
  .get(protect, getProgram)
  .put(protect, programValidation, validate, updateProgram)
  .delete(protect, deleteProgram);

router.post('/:id/complete', protect, completeProgramDay);
router.put('/:id/toggle', protect, toggleProgramActive);

module.exports = router;
