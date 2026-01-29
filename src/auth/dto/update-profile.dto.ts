import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class UpdateProfileDto{
    @ApiProperty({
        description: 'The name of the user',
        example: 'John Doe',
        required: true,
    })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({
        description: 'Email of the user',
        example: "example@gmail.com",
        required:true
    })
    @IsString()
    @IsNotEmpty()
        email:string

    @ApiProperty({
        description: 'The phone number of the user',
        example: '00000000000000',
        required: false,
    })
    @IsString()
    @IsNotEmpty()
    phone?: string;
// address , country, state, city, zip_code
    
    @ApiProperty({
        description: 'Address of user',
        example: '123, Abc/3, Tokyo',
        required:false
    })
    @IsString()
    @IsOptional()
    address?: string;

    @ApiProperty({
        description: 'Country of user',
        example: 'Japan',
        required:false
    })
    @IsString()
    @IsOptional()
    country?: string;

    @ApiProperty({
        description: 'State of user',
        example: 'Tokyo',
        required:false
    })
    @IsString()
    @IsOptional()
    state?: string;

    @ApiProperty({
        description: 'City of user',
        example: 'Tokyo',
        required:false
    })
    @IsString()
    @IsOptional()
    city?: string;

    @ApiProperty({
        description: 'Zip code of user',
        example: '120120',
        required:false
    })
    @IsString()
    @IsOptional()
    zip_code?: string;
    
}