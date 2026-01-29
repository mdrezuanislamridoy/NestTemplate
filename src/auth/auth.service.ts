import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../config/database/database.service';
import { SmtpMailService } from '../config/smtp-mail/smtp-mail.service';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ApiResponse, AuthResponse } from '../common/interfaces/response.interface';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { cResponseData } from 'src/common/cResponse';

@Injectable()
export class AuthService {
  constructor(
    private databaseService: PrismaService,
    private jwtService: JwtService,
    private smtpMailService: SmtpMailService,
  ) {}


  // Register new user
  async register(registerDto: RegisterDto): Promise<ApiResponse> {
    const { email, password, name } = registerDto;

    // Check if user already exists
    const existingUser = await this.databaseService.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await this.hashPassword(password);

    // Generate OTP
    const otpCode = this.generateOtp();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Create user
    const user = await this.databaseService.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        otpCode,
        otpExpiry,
      },
    });

    // Send OTP email
    try {
      await this.smtpMailService.sendMail(
        email,
        'Email Verification OTP',
        `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Welcome to Our Platform!</h2>
            <p>Thank you for registering. Please use the following OTP to verify your email:</p>
            <h1 style="color: #4CAF50; letter-spacing: 5px;">${otpCode}</h1>
            <p>This code will expire in 10 minutes.</p>
            <p>If you didn't request this, please ignore this email.</p>
          </div>
        `,
      );
    } catch (error) {
      console.log(error);
      
      // Delete user if email fails
      await this.databaseService.user.delete({ where: { id: user.id } });
      throw new BadRequestException('Failed to send verification email');
    }

    return {
      success: true,
      statusCode: 201,
      message: 'Registration successful. Please check your email for OTP verification.',
      data: {
        email: user.email,
        name: user.name,
      },
    };
  }

  // Verify OTP
  async verifyOtp(verifyOtpDto: VerifyOtpDto): Promise<ApiResponse<AuthResponse>> {
    const { email, otpCode } = verifyOtpDto;

    const user = await this.databaseService.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email already verified');
    }

    if (!user.otpCode || !user.otpExpiry) {
      throw new BadRequestException('OTP not found. Please request a new one.');
    }

    if (new Date() > user.otpExpiry) {
      throw new BadRequestException('OTP has expired. Please request a new one.');
    }

    if (user.otpCode !== otpCode) {
      throw new BadRequestException('Invalid OTP code');
    }

    // Update user as verified
    const updatedUser = await this.databaseService.user.update({
      where: { email },
      data: {
        isEmailVerified: true,
        otpCode: null,
        otpExpiry: null,
      },
    });

    // Generate JWT token
    const accessToken = this.generateJwtToken(updatedUser.id, updatedUser.email);

    return {
      success: true,
      statusCode: 200,
      message: 'Email verified successfully',
      data: {
        user: this.formatUserResponse(updatedUser),
        accessToken,
      },
    };
  }

  // Resend OTP
  async resendOtp(email: string): Promise<ApiResponse> {
    const user = await this.databaseService.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email already verified');
    }

    // Generate new OTP
    const otpCode = this.generateOtp();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    await this.databaseService.user.update({
      where: { email },
      data: { otpCode, otpExpiry },
    });

    // Send OTP email
    await this.smtpMailService.sendMail(
      email,
      'Email Verification OTP',
      `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Email Verification</h2>
          <p>Your new OTP code is:</p>
          <h1 style="color: #4CAF50; letter-spacing: 5px;">${otpCode}</h1>
          <p>This code will expire in 10 minutes.</p>
        </div>
      `,
    );

    return {
      success: true,
      statusCode: 200,
      message: 'OTP sent successfully',
    };
  }

  // Login
  async login(loginDto: LoginDto): Promise<ApiResponse<AuthResponse>> {
    const { email, password } = loginDto;

    const user = await this.databaseService.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await this.comparePassword(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isEmailVerified) {
      throw new UnauthorizedException(
        'Please verify your email before logging in',
      );
    }

    // Generate JWT token
    const accessToken = this.generateJwtToken(user.id, user.email);

    await this.databaseService.user.update({
      where: { email },
      data: { lastLogin: new Date() }
    })


    return {
      success: true,
      statusCode: 200,
      message: 'Login successful',
      data: {
        user: this.formatUserResponse(user),
        accessToken,
      },
    };
  }

  // Forgot Password
  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<ApiResponse> {
    const { email } = forgotPasswordDto;

    const user = await this.databaseService.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal if user exists or not for security
      return {
        success: true,
        statusCode: 200,
        message: 'If the email exists, a password reset link has been sent',
      };
    }

    // Generate reset token
    const resetToken = this.generateToken(32);
    const resetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.databaseService.user.update({
      where: { email },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpiry: resetExpiry,
      },
    });

    // Send reset email
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

    await this.smtpMailService.sendMail(
      email,
      'Password Reset Request',
      `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Password Reset Request</h2>
          <p>You requested to reset your password. Click the button below to proceed:</p>
          <a href="${resetLink}" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">Reset Password</a>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this, please ignore this email.</p>
        </div>
      `,
    );

    return {
      success: true,
      statusCode: 200,
      message: 'If the email exists, a password reset link has been sent',
    };
  }

  // Reset Password
  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<ApiResponse> {
    const { token, newPassword } = resetPasswordDto;

    const user = await this.databaseService.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpiry: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Hash new password
    const hashedPassword = await this.hashPassword(newPassword);

    // Update password and clear reset token
    await this.databaseService.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpiry: null,
      },
    });

    return {
      success: true,
      statusCode: 200,
      message: 'Password reset successful',
    };
  }

  // Change Password
  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<ApiResponse> {
    const { currentPassword, newPassword } = changePasswordDto;

    const user = await this.databaseService.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isPasswordValid = await this.comparePassword(
      currentPassword,
      user.password,
    );

    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Check if new password is same as old password
    const isSamePassword = await this.comparePassword(newPassword, user.password);

    if (isSamePassword) {
      throw new BadRequestException(
        'New password must be different from current password',
      );
    }

    // Hash new password
    const hashedPassword = await this.hashPassword(newPassword);

    // Update password
    await this.databaseService.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return {
      success: true,
      statusCode: 200,
      message: 'Password changed successfully',
    };
  }

  // Get current user profile
  async getProfile(userId: string): Promise<ApiResponse> {
    const user = await this.databaseService.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isEmailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      success: true,
      statusCode: 200,
      message: 'Profile retrieved successfully',
      data: user,
    };
  }

  async updateProfilePicture(file: Express.Multer.File,userId:string) {
    try {
      
      if (!file) {
        throw new NotFoundException("File not found")
      }
      const filePath = `${'localhost:3000'}/uploads/profile/${file.filename}`

      await this.databaseService.user.update({
        where: { id: userId },
        data: {
          profilePic:filePath
        }
      })

    } catch (error) {
      console.log(error);
      
      throw new BadRequestException("Failed to update profile picture")
    }
  }

  async updateProfile(dto: UpdateProfileDto,userId:string) {
    try {
      const profile = await this.databaseService.user.update({
        where:{id:userId},
        data: { ...dto },
        select: {
          name: true,
          email: true,
          phone: true,
          address: true,
          country: true,
          state: true,
          city: true,
          zip_code: true
        }
      })

      if (!profile) {
        throw new NotFoundException("Profile not found")
      }

      return cResponseData({
        message: 'Profile updated successfully',
        data:profile
      })

    } catch (error) {
      console.log(error);
      throw new BadRequestException("Failed to update profile")
    }
  }



    // Generate 6-digit OTP
  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Generate random token
  private generateToken(length: number = 32): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < length; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }

  // Hash password
  private async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  // Compare password
  private async comparePassword(
    password: string,
    hash: string,
  ): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  // Generate JWT token
  private generateJwtToken(userId: string, email: string): string {
    const payload = { sub: userId, email };
    return this.jwtService.sign(payload);
  }

  // Format user response
  private formatUserResponse(user: any): AuthResponse['user'] {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
    };
  }

}
