const express = require('express');
const router = express.Router();
const { getExams, getExamById, createExam, exportNilaiExcel, updateExam, deleteExam } = require('../controllers/examController');
const { getQuestionsByExam } = require('../controllers/questionController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.get('/', verifyToken, getExams);
router.post('/', verifyToken, createExam);

// 👇 PERBAIKAN DI SINI: Gunakan PUT untuk Update, DELETE untuk Hapus, dan tambahkan /:id
router.put('/:id', verifyToken, updateExam);
router.delete('/:id', verifyToken, deleteExam);

router.get('/export/:exam_id', verifyToken, exportNilaiExcel); 
router.get('/:id', verifyToken, getExamById);
router.get('/:examId/questions', verifyToken, getQuestionsByExam);


module.exports = router;