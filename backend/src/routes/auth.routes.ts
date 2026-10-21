import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validateBody } from '../middlewares/validate';
import { requestOtpSchema, verifyOtpSchema } from '../validators/auth.validator';

const router = Router();

// POST /api/auth/request-otp - Request mock OTP
router.post('/request-otp', validateBody(requestOtpSchema), AuthController.requestOtp);

// POST /api/auth/verify-otp - Verify OTP and receive JWT
router.post('/verify-otp', validateBody(verifyOtpSchema), AuthController.verifyOtp);

export default router;
