import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Patch,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse as SwaggerResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from '../decorators/public.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { storageConfig } from 'src/common/fileUpload/storage.configure';
import { GetUser } from 'src/decorators/get-user.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a new user',
    description: 'Create a new user account and send OTP for email verification',
  })
  @SwaggerResponse({
    status: 201,
    description: 'User registered successfully. OTP sent to email.',
    schema: {
      example: {
        success: true,
        statusCode: 201,
        message: 'Registration successful. Please check your email for OTP verification.',
        data: {
          email: 'user@example.com',
          name: 'John Doe',
        },
      },
    },
  })
  @SwaggerResponse({
    status: 400,
    description: 'Bad Request - Validation error or user already exists',
    schema: {
      example: {
        success: false,
        statusCode: 400,
        timestamp: '2026-01-23T10:30:00.000Z',
        path: '/auth/register',
        method: 'POST',
        error: 'Bad Request',
        message: ['User with this email already exists'],
      },
    },
  })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify OTP',
    description: 'Verify email with OTP code sent during registration',
  })
  @SwaggerResponse({
    status: 200,
    description: 'Email verified successfully',
    schema: {
      example: {
        success: true,
        statusCode: 200,
        message: 'Email verified successfully',
        data: {
          user: {
            id: 1,
            email: 'user@example.com',
            name: 'John Doe',
            role: 'USER',
            isEmailVerified: true,
          },
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
        },
      },
    },
  })
  @SwaggerResponse({
    status: 400,
    description: 'Invalid or expired OTP',
  })
  async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    return this.authService.verifyOtp(verifyOtpDto);
  }

  @Public()
  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Resend OTP',
    description: 'Resend verification OTP to email',
  })
  @SwaggerResponse({
    status: 200,
    description: 'OTP sent successfully',
  })
  async resendOtp(@Body() resendOtpDto: ResendOtpDto) {
    return this.authService.resendOtp(resendOtpDto.email);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'User login',
    description: 'Login with email and password',
  })
  @SwaggerResponse({
    status: 200,
    description: 'Login successful',
    schema: {
      example: {
        success: true,
        statusCode: 200,
        message: 'Login successful',
        data: {
          user: {
            id: 1,
            email: 'user@example.com',
            name: 'John Doe',
            role: 'USER',
            isEmailVerified: true,
          },
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
        },
      },
    },
  })
  @SwaggerResponse({
    status: 401,
    description: 'Invalid credentials or email not verified',
  })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Forgot password',
    description: 'Request password reset link via email',
  })
  @SwaggerResponse({
    status: 200,
    description: 'Password reset email sent if user exists',
  })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset password',
    description: 'Reset password using token from email',
  })
  @SwaggerResponse({
    status: 200,
    description: 'Password reset successful',
  })
  @SwaggerResponse({
    status: 400,
    description: 'Invalid or expired reset token',
  })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Change password',
    description: 'Change password for authenticated user',
  })
  @SwaggerResponse({
    status: 200,
    description: 'Password changed successfully',
  })
  @SwaggerResponse({
    status: 400,
    description: 'Current password is incorrect',
  })
  @SwaggerResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  async changePassword(
    @GetUser() user:{ sub: string },
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(user.sub, changePasswordDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get user profile',
    description: 'Get current authenticated user profile',
  })
  @SwaggerResponse({
    status: 200,
    description: 'Profile retrieved successfully',
    schema: {
      example: {
        success: true,
        statusCode: 200,
        message: 'Profile retrieved successfully',
        data: {
          id: 1,
          email: 'user@example.com',
          name: 'John Doe',
          role: 'USER',
          isEmailVerified: true,
          createdAt: '2026-01-23T10:00:00.000Z',
          updatedAt: '2026-01-23T10:00:00.000Z',
        },
      },
    },
  })
  @SwaggerResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  async getProfile(@GetUser() user:{sub:string}) {
    return this.authService.getProfile(user.sub);
  }

  @Patch("upload-profile-pic")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor("file", {
    storage: storageConfig('uploads/profile')
  }))
  @ApiOperation({ summary: "Update profile picture" })
  async updateProfilePicture(@GetUser() user:{ sub: string }, @Body() file: Express.Multer.File) {
    return this.authService.updateProfilePicture(file,user.sub);
  }

  @Patch('update-profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update profile' })
  async updateProfile(@GetUser() user:{ sub: string }, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(dto, user.sub);
  }
}
